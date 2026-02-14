import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'home_provider.dart';
import '../../core/models/song.dart';
import '../player/player_provider.dart';
import '../auth/auth_service.dart';

class HomeContent extends ConsumerWidget {
  const HomeContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final homeDataAsync = ref.watch(homeProvider);
    final theme = Theme.of(context);

    String greeting = _getGreeting();
    String userName = user?.displayName?.split(' ').first ?? 'Friend'; // Use first name or fallback

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              greeting,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey[400],
                fontSize: 14,
              ),
            ),
            Text(
              userName,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.notifications), onPressed: () {}),
          IconButton(icon: const Icon(Icons.history), onPressed: () {}),
        ],
      ),
      body: homeDataAsync.when(
        data: (homeData) => SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionTitle(homeData.recentlyPlayedTitle),
                _buildHorizontalList(context, ref, homeData.recentlyPlayed),
                const SizedBox(height: 20),
                _buildSectionTitle(homeData.madeForYouTitle),
                _buildHorizontalList(context, ref, homeData.madeForYou),
                const SizedBox(height: 20),
                _buildSectionTitle(homeData.trendingNowTitle),
                _buildHorizontalList(context, ref, homeData.trendingNow),
              ],
            ),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildHorizontalList(BuildContext context, WidgetRef ref, List<Song> songs) {
    if (songs.isEmpty) {
       return const SizedBox(
         height: 150,
         child: Center(child: Text("No songs found")),
       );
    }
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: songs.length,
        itemBuilder: (context, index) {
          final song = songs[index];
          return GestureDetector(
            onTap: () {
              // Use playNewSong to start a fresh radio based on this track
              ref.read(playerProvider.notifier).playNewSong(songs[index]);
            },
            child: Container(
              width: 140,
              margin: const EdgeInsets.only(right: 15),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      song.thumbnail,
                      height: 140,
                      width: 140,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          Container(
                            height: 140, 
                            width: 140, 
                            color: Colors.grey[800], 
                            child: const Icon(Icons.music_note, size: 50)
                          ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    song.title, 
                    maxLines: 1, 
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    song.artist, 
                    maxLines: 1, 
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }
}
