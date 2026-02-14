import 'package:audio_service/audio_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../services/audio/audio_service.dart';
import 'player_provider.dart';

class NowPlayingScreen extends ConsumerWidget {
  const NowPlayingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(playerProvider);
    final audioHandler = ref.read(audioHandlerProvider);
    final song = playerState.currentSong;

    if (song == null) {
      return const Scaffold(
        body: Center(child: Text('No song playing')),
      );
    }

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A1A2E), Color(0xFF0A0A0A)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down, size: 32),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Text('NOW PLAYING',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 2)),
                    IconButton(
                      icon: const Icon(Icons.more_vert),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Album art
              Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.3),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    song.thumbnail,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, st) => Container(
                      color: Colors.grey[800],
                      child: const Icon(Icons.music_note, size: 80),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // Song info
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    Text(
                      song.title,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      song.artist,
                      style: TextStyle(fontSize: 16, color: Colors.white.withOpacity(0.6)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Progress bar
              StreamBuilder<Duration>(
                stream: AudioService.position,
                builder: (context, snapshot) {
                  final position = snapshot.data ?? Duration.zero;
                  return StreamBuilder<PlaybackState>(
                    stream: audioHandler.playbackState,
                    builder: (context, pbSnapshot) {
                      final mediaItem = audioHandler.mediaItem.value;
                      final duration = mediaItem?.duration ?? Duration.zero;
                      final total = duration.inMilliseconds > 0
                          ? duration
                          : const Duration(minutes: 4); // fallback

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Column(
                          children: [
                            SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                trackHeight: 3,
                                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                              ),
                              child: Slider(
                                value: position.inMilliseconds.toDouble().clamp(
                                    0, total.inMilliseconds.toDouble()),
                                max: total.inMilliseconds.toDouble(),
                                activeColor: AppTheme.primary,
                                inactiveColor: Colors.white24,
                                onChanged: (value) {
                                  audioHandler.seek(Duration(milliseconds: value.toInt()));
                                },
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(_formatDuration(position),
                                      style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.5))),
                                  Text(_formatDuration(total),
                                      style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.5))),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),

              const SizedBox(height: 16),

              // Controls
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Shuffle
                    IconButton(
                      icon: Icon(
                        Icons.shuffle,
                        color: playerState.isShuffled ? AppTheme.primary : Colors.white70,
                      ),
                      onPressed: () => ref.read(playerProvider.notifier).toggleShuffle(),
                    ),
                    // Previous
                    IconButton(
                      icon: const Icon(Icons.skip_previous, size: 36),
                      color: playerState.hasPrevious ? Colors.white : Colors.white30,
                      onPressed: playerState.hasPrevious
                          ? () => ref.read(playerProvider.notifier).previous()
                          : null,
                    ),
                    // Play/Pause
                    StreamBuilder<PlaybackState>(
                      stream: audioHandler.playbackState,
                      builder: (context, snapshot) {
                        final isPlaying = snapshot.data?.playing ?? false;
                        return Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.primary,
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primary.withOpacity(0.4),
                                blurRadius: 20,
                              ),
                            ],
                          ),
                          child: IconButton(
                            icon: Icon(
                              isPlaying ? Icons.pause : Icons.play_arrow,
                              size: 36,
                              color: Colors.black,
                            ),
                            onPressed: () {
                              if (isPlaying) {
                                audioHandler.pause();
                              } else {
                                audioHandler.play();
                              }
                            },
                          ),
                        );
                      },
                    ),
                    // Next
                    IconButton(
                      icon: const Icon(Icons.skip_next, size: 36),
                      color: playerState.hasNext ? Colors.white : Colors.white30,
                      onPressed: playerState.hasNext
                          ? () => ref.read(playerProvider.notifier).next()
                          : null,
                    ),
                    // Repeat (placeholder)
                    IconButton(
                      icon: const Icon(Icons.repeat, color: Colors.white70),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}
