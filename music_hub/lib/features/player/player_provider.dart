import 'package:flutter/foundation.dart';
import 'package:audio_service/audio_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/song.dart';
import '../../services/api/api_service.dart';
import '../../services/audio/audio_service.dart';
import '../../services/audio/audio_handler.dart';
import '../../services/cache/cache_service.dart';

/// Tracks the current queue and playing index
class PlayerState {
  final List<Song> queue;
  final int currentIndex;
  final bool isShuffled;
  final bool isLoadingQueue;

  const PlayerState({
    this.queue = const [],
    this.currentIndex = -1,
    this.isShuffled = false,
    this.isLoadingQueue = false,
  });

  Song? get currentSong =>
      currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  bool get hasNext => currentIndex < queue.length - 1;
  bool get hasPrevious => currentIndex > 0;

  PlayerState copyWith({
    List<Song>? queue,
    int? currentIndex,
    bool? isShuffled,
    bool? isLoadingQueue,
  }) {
    return PlayerState(
      queue: queue ?? this.queue,
      currentIndex: currentIndex ?? this.currentIndex,
      isShuffled: isShuffled ?? this.isShuffled,
      isLoadingQueue: isLoadingQueue ?? this.isLoadingQueue,
    );
  }
}

class PlayerNotifier extends StateNotifier<PlayerState> {
  final AudioPlayerHandler _audioHandler;
  final ApiService _apiService;
  final CacheService _cacheService;

  PlayerNotifier(this._audioHandler, this._apiService, this._cacheService) : super(const PlayerState()) {
    // Auto-play next song when current finishes
    _audioHandler.onComplete = _onSongComplete;
  }

  void _onSongComplete() {
    if (state.hasNext) {
      next();
    } else {
      // End of queue — stop playback
      _audioHandler.stop();
    }
  }

  /// Play a song from a list (sets the full list as queue)
  /// Then loads 10 more related songs from backend
  Future<void> playSongFromList(List<Song> songs, int index) async {
    state = state.copyWith(queue: songs, currentIndex: index);
    await _loadAndPlay(songs[index]);
    // Load more related songs in the background
    _loadQueueFromBackend(songs[index]);
  }

  /// User taps a different song — play it immediately
  /// This replaces the "next" songs in the queue with a new mix based on this song
  Future<void> playNewSong(Song song) async {
    // 1. Stop current playback handled by playMediaItem, but good to be explicit if needed.
    // Actually, playMediaItem will handle the switch.

    // 2. Clear upcoming queue to start fresh context
    // We keep the history (0 to currentIndex) and append the new song
    final history = state.queue.sublist(0, state.currentIndex + 1);
    
    // Remove duplicate if the new song was already in history (optional, but keeps list clean)
    // history.removeWhere((s) => s.id == song.id); 
    // Actually, allowing duplicates in history is fine.

    final newQueue = [...history, song];
    final newIndex = newQueue.length - 1;

    state = state.copyWith(
      queue: newQueue,
      currentIndex: newIndex,
    );

    // 3. Play immediately
    await _loadAndPlay(song);

    // 4. Load related songs for the NEW song
    _loadQueueFromBackend(song);
  }

  Future<void> next() async {
    if (state.hasNext) {
      final newIndex = state.currentIndex + 1;
      state = state.copyWith(currentIndex: newIndex);
      await _loadAndPlay(state.queue[newIndex]);
    }
  }

  Future<void> previous() async {
    if (state.hasPrevious) {
      final newIndex = state.currentIndex - 1;
      state = state.copyWith(currentIndex: newIndex);
      await _loadAndPlay(state.queue[newIndex]);
    }
  }

  void toggleShuffle() {
    if (state.isShuffled) {
      state = state.copyWith(isShuffled: false);
    } else {
      final current = state.currentSong;
      final remaining = List<Song>.from(state.queue);
      if (current != null) remaining.remove(current);
      remaining.shuffle();
      if (current != null) remaining.insert(0, current);
      state = state.copyWith(queue: remaining, currentIndex: 0, isShuffled: true);
    }
  }

  /// Load 10 related songs from backend and append to queue
  Future<void> _loadQueueFromBackend(Song song) async {
    if (state.isLoadingQueue) return;
    state = state.copyWith(isLoadingQueue: true);

    try {
      final results = await _apiService.get('/queue', queryParameters: {
        'videoId': song.id,
        'title': song.title,
      });

      if (results is List && results.isNotEmpty) {
        final newSongs = results.map((e) => Song.fromJson(e)).toList();

        // Filter out songs already in queue
        final existingIds = state.queue.map((s) => s.id).toSet();
        final uniqueNew = newSongs.where((s) => !existingIds.contains(s.id)).toList();

        if (uniqueNew.isNotEmpty) {
          final updatedQueue = List<Song>.from(state.queue)..addAll(uniqueNew);
          state = state.copyWith(queue: updatedQueue, isLoadingQueue: false);
          return;
        }
      }
    } catch (e) {
      debugPrint('Failed to load queue: $e');
    }
    state = state.copyWith(isLoadingQueue: false);
  }

  Future<void> _loadAndPlay(Song song) async {
    // Stop current playback immediately so the user knows the request is processing
    // and the old song doesn't keep playing while we fetch the new URL.
    await _audioHandler.stop();

    try {
      // 1. Check Offline Cache
      final cachedSong = _cacheService.getCachedSong(song.id);
      if (cachedSong != null && cachedSong.localAudioPath != null) {
        debugPrint('Playing from cache: ${song.title}');
        await _audioHandler.playMediaItem(MediaItem(
          id: cachedSong.localAudioPath!, // Local file path
          title: cachedSong.title,
          artist: cachedSong.artist,
          artUri: Uri.file(cachedSong.localImagePath ?? ''), // Local or fallback?
          extras: {'isLocal': true},
        ));

        // Attempt to load local image URI, might fail if paths are tricky with artUri.
        // Usually better to use file:// scheme.
        // For thumbnail in UI, the model has localImagePath.
        // For notification, artUri needs to be accessible. 
        // We'll leave it as is for now, just handle audio source.
        
        // Actually, for just_audio background, local files need Uri.file()
        // The handler uses setAudioSource(AudioSource.uri(Uri.parse(mediaItem.id)))
        // So we must pass the file URI string as ID if local.
        await _audioHandler.playMediaItem(MediaItem(
          id: Uri.file(cachedSong.localAudioPath!).toString(),
          title: song.title,
          artist: song.artist,
          artUri: Uri.tryParse(song.thumbnail), // Keep remote URL for now for notification
        ));
        return;
      }

      // 2. Not Cached? Stream & Cache in Background
      final streamData = await _apiService.get('/stream', queryParameters: {
        'videoId': song.id,
      });

      final streamUrl = streamData['url'] as String?;
      if (streamUrl == null || streamUrl.isEmpty) {
        throw Exception('No stream URL');
      }

      // Start playback immediately
      await _audioHandler.playMediaItem(MediaItem(
        id: streamUrl,
        title: song.title,
        artist: song.artist,
        artUri: Uri.tryParse(song.thumbnail),
      ));

      // Trigger background download
      _cacheService.cacheSong(song, streamUrl);

    } catch (e) {
      debugPrint('Failed to play song: $e');
      // Try next if this one fails
      if (state.hasNext) {
        next();
      }
    }
  }

  @override
  void dispose() {
    _audioHandler.onComplete = null;
    super.dispose();
  }
}

final playerProvider = StateNotifierProvider<PlayerNotifier, PlayerState>((ref) {
  final audioHandler = ref.read(audioHandlerProvider) as AudioPlayerHandler;
  final apiService = ref.read(apiServiceProvider);
  final cacheService = ref.read(cacheServiceProvider);
  return PlayerNotifier(audioHandler, apiService, cacheService);
});
