import 'package:flutter/foundation.dart';
import 'package:audio_service/audio_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';
import '../../core/models/song.dart';
import '../../services/api/api_service.dart';
import '../../services/audio/audio_service.dart';
import '../../services/audio/audio_handler.dart';
import '../../services/cache/cache_service.dart';
import '../../services/network/network_quality_service.dart';

/// Snapshot of a queue that was interrupted by priority play
class SavedQueue {
  final List<Song> queue;
  final int resumeIndex;

  const SavedQueue({required this.queue, required this.resumeIndex});
}

/// Tracks the current queue and playing index
class PlayerState {
  final List<Song> queue;
  final int currentIndex;
  final bool isShuffled;
  final bool isLoadingQueue;
  final List<SavedQueue> savedQueues;

  const PlayerState({
    this.queue = const [],
    this.currentIndex = -1,
    this.isShuffled = false,
    this.isLoadingQueue = false,
    this.savedQueues = const [],
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
    List<SavedQueue>? savedQueues,
  }) {
    return PlayerState(
      queue: queue ?? this.queue,
      currentIndex: currentIndex ?? this.currentIndex,
      isShuffled: isShuffled ?? this.isShuffled,
      isLoadingQueue: isLoadingQueue ?? this.isLoadingQueue,
      savedQueues: savedQueues ?? this.savedQueues,
    );
  }
}

class PlayerNotifier extends StateNotifier<PlayerState> {
  final AudioPlayerHandler _audioHandler;
  final ApiService _apiService;
  final CacheService _cacheService;
  final NetworkQualityService _networkQualityService;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  StreamSubscription<NetworkQuality>? _qualitySubscription;
  NetworkQuality _currentNetworkQuality = NetworkQuality.high;
  String _currentVideoId = '';
  bool _isRetryingWithLowerQuality = false;

  PlayerNotifier(this._audioHandler, this._apiService, this._cacheService, this._networkQualityService) : super(const PlayerState()) {
    // Auto-play next song when current finishes
    _audioHandler.onComplete = _onSongComplete;
    
    // Monitor network connectivity changes
    _setupConnectivityListener();
    
    // Monitor network quality changes
    _setupNetworkQualityListener();
  }

  void _setupConnectivityListener() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      // When network changes, ensure audio continues playing
      // The audio player should handle network transitions automatically
      if (result != ConnectivityResult.none) {
        debugPrint('Network changed to: $result');
        // Audio player will automatically reconnect to the stream
      }
    });
  }
  
  void _setupNetworkQualityListener() {
    _networkQualityService.initialize();
    _currentNetworkQuality = _networkQualityService.currentQuality;
    
    _qualitySubscription = _networkQualityService.qualityStream?.listen((NetworkQuality quality) {
      debugPrint('Network quality changed: $quality');
      
      // If quality degraded while playing, switch to lower quality
      if (_currentNetworkQuality == NetworkQuality.high && 
          (quality == NetworkQuality.low || quality == NetworkQuality.medium)) {
        _handleQualityDegradation();
      }
      
      _currentNetworkQuality = quality;
    });
  }
  
  void _handleQualityDegradation() {
    // If currently playing, retry with lower quality
    if (_audioHandler.isPlaying && _currentVideoId.isNotEmpty && !_isRetryingWithLowerQuality) {
      debugPrint('Network degraded, switching to lower quality stream');
      _isRetryingWithLowerQuality = true;
      
      // Get current position
      final currentSong = state.currentSong;
      if (currentSong != null) {
        // Retry with current quality setting
        _retryWithQuality(currentSong, _networkQualityService.currentQuality);
      }
      
      _isRetryingWithLowerQuality = false;
    }
  }
  
  Future<void> _retryWithQuality(Song song, NetworkQuality quality) async {
    try {
      final streamData = await _apiService.get('/stream', queryParameters: {
        'videoId': song.id,
        'quality': _networkQualityService.getQualityString(),
      });

      final streamUrl = streamData['url'] as String?;
      if (streamUrl != null && streamUrl.isNotEmpty) {
        // Switch stream without interrupting playback if possible
        await _audioHandler.switchStream(streamUrl);
      }
    } catch (e) {
      debugPrint('Failed to switch quality: $e');
    }
  }

  void _onSongComplete() {
    if (state.hasNext) {
      next();
    } else if (state.savedQueues.isNotEmpty) {
      // Current queue ended — restore the previous queue
      _restoreSavedQueue();
    } else {
      // End of all queues — stop playback
      _audioHandler.stop();
    }
  }

  /// Pop the last saved queue off the stack and resume playback
  Future<void> _restoreSavedQueue() async {
    final stack = List<SavedQueue>.from(state.savedQueues);
    final saved = stack.removeLast();

    if (saved.resumeIndex < saved.queue.length) {
      state = state.copyWith(
        queue: saved.queue,
        currentIndex: saved.resumeIndex,
        savedQueues: stack,
      );
      await _loadAndPlay(saved.queue[saved.resumeIndex]);
    } else if (stack.isNotEmpty) {
      // This saved queue was exhausted, try the next one down the stack
      state = state.copyWith(savedQueues: stack);
      _restoreSavedQueue();
    } else {
      state = state.copyWith(savedQueues: []);
      _audioHandler.stop();
    }
  }

  /// Play a song from a list (sets the full list as queue)
  /// Saves the current queue so it can resume after this list finishes
  Future<void> playSongFromList(List<Song> songs, int index) async {
    // Save current queue if one is active
    if (state.queue.isNotEmpty && state.currentIndex >= 0) {
      final saved = SavedQueue(
        queue: List<Song>.from(state.queue),
        resumeIndex: state.currentIndex + 1,
      );
      state = state.copyWith(
        queue: songs,
        currentIndex: index,
        savedQueues: [...state.savedQueues, saved],
      );
    } else {
      state = state.copyWith(queue: songs, currentIndex: index);
    }
    await _loadAndPlay(songs[index]);
    // Load more related songs in the background
    _loadQueueFromBackend(songs[index]);
  }

  /// User taps a different song — save the current queue and play immediately.
  /// When the new queue ends, the saved queue resumes automatically.
  Future<void> playNewSong(Song song) async {
    // 1. Save the current queue + position so we can resume later
    if (state.queue.isNotEmpty && state.currentIndex >= 0) {
      final saved = SavedQueue(
        queue: List<Song>.from(state.queue),
        resumeIndex: state.currentIndex + 1, // resume from the next song
      );
      state = state.copyWith(
        queue: [song],
        currentIndex: 0,
        savedQueues: [...state.savedQueues, saved],
      );
    } else {
      state = state.copyWith(queue: [song], currentIndex: 0);
    }

    // 2. Play immediately
    await _loadAndPlay(song);

    // 3. Load related songs for the NEW song
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
        final newSongs = results
            .map((e) => Song.fromJson(e as Map<String, dynamic>))
            .toList();

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
    _currentVideoId = song.id;
    await _audioHandler.stop();

    try {
      // 1. Check Offline Cache
      final cachedSong = _cacheService.getCachedSong(song.id);
      if (cachedSong != null && cachedSong.localAudioPath != null) {
        debugPrint('Playing from cache: ${song.title}');
        await _audioHandler.playMediaItem(MediaItem(
          id: Uri.file(cachedSong.localAudioPath!).toString(),
          title: song.title,
          artist: song.artist,
          artUri: Uri.tryParse(song.thumbnail),
          duration: _parseDuration(song.duration),
        ));
        return;
      }

      // 2. Try to stream with auto-quality
      final quality = _networkQualityService.getQualityString();
      debugPrint('Streaming ${song.title} with quality: $quality');
      
      String? streamUrl = await _getStreamUrl(song.id, quality, useProxy: false);
      
      // 3. If direct URL fails, retry with proxy
      if (streamUrl == null) {
        debugPrint('Direct stream failed, trying proxy...');
        streamUrl = await _getStreamUrl(song.id, quality, useProxy: true);
      }
      
      if (streamUrl == null) {
        throw Exception('Could not get stream URL');
      }

      // Start playback
      await _audioHandler.playMediaItem(MediaItem(
        id: streamUrl,
        title: song.title,
        artist: song.artist,
        artUri: Uri.tryParse(song.thumbnail),
        duration: _parseDuration(song.duration),
      ));

      // Background download
      _cacheService.cacheSong(song, streamUrl);

    } catch (e) {
      debugPrint('Failed to play song: $e');
      // Show error to user or try next song
      if (state.hasNext) {
        next();
      }
    }
  }
  
  Future<String?> _getStreamUrl(String videoId, String quality, {bool useProxy = false}) async {
    try {
      final streamData = await _apiService.get('/stream', queryParameters: {
        'videoId': videoId,
        'quality': quality,
        'useProxy': useProxy.toString(),
      });
      
      return streamData['url'] as String?;
    } catch (e) {
      debugPrint('Stream URL error: $e');
      return null;
    }
  }

  Duration _parseDuration(String s) {
    try {
      final parts = s.split(':');
      if (parts.length == 2) {
        return Duration(minutes: int.parse(parts[0]), seconds: int.parse(parts[1]));
      }
      if (parts.length == 3) {
        return Duration(hours: int.parse(parts[0]), minutes: int.parse(parts[1]), seconds: int.parse(parts[2]));
      }
    } catch (e) {
      return Duration.zero;
    }
    return Duration.zero;
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _qualitySubscription?.cancel();
    _audioHandler.onComplete = null;
    super.dispose();
  }
}

// Singleton provider for NetworkQualityService
final networkQualityServiceProvider = Provider<NetworkQualityService>((ref) {
  return NetworkQualityService();
});

final playerProvider = StateNotifierProvider<PlayerNotifier, PlayerState>((ref) {
  final audioHandler = ref.read(audioHandlerProvider) as AudioPlayerHandler;
  final apiService = ref.read(apiServiceProvider);
  final cacheService = ref.read(cacheServiceProvider);
  final networkQualityService = ref.read(networkQualityServiceProvider);
  return PlayerNotifier(audioHandler, apiService, cacheService, networkQualityService);
});
