import 'package:audio_service/audio_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../services/audio/audio_service.dart';
import 'player_provider.dart';
import 'now_playing_screen.dart';

class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(playerProvider);
    final audioHandler = ref.read(audioHandlerProvider);
    final song = playerState.currentSong;

    if (song == null) return const SizedBox.shrink();

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NowPlayingScreen()),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E2E),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.network(
                song.thumbnail,
                width: 42,
                height: 42,
                fit: BoxFit.cover,
                errorBuilder: (ctx, err, st) => Container(
                  width: 42, height: 42,
                  color: Colors.grey[800],
                  child: const Icon(Icons.music_note, size: 20),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Song info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    song.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  Text(
                    song.artist,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                  ),
                ],
              ),
            ),
            // Play/pause
            StreamBuilder<PlaybackState>(
              stream: audioHandler.playbackState,
              builder: (context, snapshot) {
                final isPlaying = snapshot.data?.playing ?? false;
                return IconButton(
                  icon: Icon(isPlaying ? Icons.pause : Icons.play_arrow),
                  color: AppTheme.primary,
                  onPressed: () {
                    if (isPlaying) {
                      audioHandler.pause();
                    } else {
                      audioHandler.play();
                    }
                  },
                );
              },
            ),
            // Next
            IconButton(
              icon: const Icon(Icons.skip_next),
              color: playerState.hasNext ? Colors.white : Colors.white30,
              iconSize: 22,
              onPressed: playerState.hasNext
                  ? () => ref.read(playerProvider.notifier).next()
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
