import 'package:audio_service/audio_service.dart';
import 'package:just_audio/just_audio.dart';

class AudioPlayerHandler extends BaseAudioHandler with SeekHandler, QueueHandler {
  final AudioPlayer _player = AudioPlayer();
  void Function()? onComplete;
  void Function()? onSkipToNext;
  void Function()? onSkipToPrevious;

  AudioPlayerHandler() {
    _player.playbackEventStream.map(_transformEvent).pipe(playbackState);
    _player.processingStateStream.listen((state) {
      if (state == ProcessingState.completed) {
        if (onComplete != null) {
          onComplete!();
        } else {
          stop();
        }
      }
    });
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> stop() async {
    await _player.stop();
    await super.stop();
  }

  @override
  Future<void> skipToNext() async {
    if (onSkipToNext != null) {
      onSkipToNext!();
    }
  }

  @override
  Future<void> skipToPrevious() async {
    if (onSkipToPrevious != null) {
      onSkipToPrevious!();
    }
  }

  @override
  Future<void> fastForward() async {
    await _player.seek(_player.position + const Duration(seconds: 10));
  }

  @override
  Future<void> rewind() async {
    await _player.seek(_player.position - const Duration(seconds: 10));
  }

  bool get isPlaying => _player.playing;

  Future<void> switchStream(String newUrl) async {
    // Store current position
    final position = _player.position;
    final wasPlaying = _player.playing;
    
    try {
      // Set new audio source while maintaining position
      await _player.setAudioSource(
        AudioSource.uri(Uri.parse(newUrl)),
        preload: true,
      );
      
      // Seek to previous position
      await _player.seek(position);
      
      // Resume if it was playing
      if (wasPlaying) {
        await play();
      }
    } catch (e) {
      print("Error switching stream: $e");
      // If switching fails, continue with current stream
    }
  }

  @override
  Future<void> playMediaItem(MediaItem mediaItem) async {
    this.mediaItem.add(mediaItem);
    try {
      await _player.setAudioSource(
        AudioSource.uri(
          Uri.parse(mediaItem.id),
          tag: mediaItem,
        ),
        // Preload to handle network transitions better
        preload: true,
      );
      play();
    } catch (e) {
      print("Error playing audio: $e");
      // Retry once on network error
      try {
        await Future.delayed(const Duration(seconds: 1));
        await _player.setAudioSource(
          AudioSource.uri(
            Uri.parse(mediaItem.id),
            tag: mediaItem,
          ),
          preload: true,
        );
        play();
      } catch (retryError) {
        print("Retry failed: $retryError");
      }
    }
  }

  PlaybackState _transformEvent(PlaybackEvent event) {
    return PlaybackState(
      controls: [
        MediaControl.skipToPrevious,
        MediaControl.rewind,
        if (_player.playing) MediaControl.pause else MediaControl.play,
        MediaControl.fastForward,
        MediaControl.skipToNext,
        MediaControl.stop,
      ],
      systemActions: const {
        MediaAction.seek,
        MediaAction.seekForward,
        MediaAction.seekBackward,
        MediaAction.skipToNext,
        MediaAction.skipToPrevious,
        MediaAction.play,
        MediaAction.pause,
        MediaAction.stop,
        MediaAction.fastForward,
        MediaAction.rewind,
      },
      androidCompactActionIndices: const [0, 2, 4], // Previous, Play/Pause, Next
      processingState: const {
        ProcessingState.idle: AudioProcessingState.idle,
        ProcessingState.loading: AudioProcessingState.loading,
        ProcessingState.buffering: AudioProcessingState.buffering,
        ProcessingState.ready: AudioProcessingState.ready,
        ProcessingState.completed: AudioProcessingState.completed,
      }[_player.processingState]!,
      playing: _player.playing,
      updatePosition: _player.position,
      bufferedPosition: _player.bufferedPosition,
      speed: _player.speed,
      queueIndex: event.currentIndex,
    );
  }
}

