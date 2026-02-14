import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'home_provider.dart';
import '../../core/models/song.dart';

class HomeContent extends ConsumerWidget {
  const HomeContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeDataAsync = ref.watch(homeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Good Morning'), // Dynamic greeting later
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
                _buildSectionTitle('Recently Played'),
                _buildHorizontalList(homeData.recentlyPlayed),
                const SizedBox(height: 20),
                _buildSectionTitle('Made For You'),
                _buildHorizontalList(homeData.madeForYou),
                const SizedBox(height: 20),
                _buildSectionTitle('Trending Now'),
                _buildHorizontalList(homeData.trendingNow),
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

  Widget _buildHorizontalList(List<Song> songs) {
    if (songs.isEmpty) {
       return const SizedBox(
         height: 150,
         child: Center(child: Text("No songs found")),
       );
    }
    return SizedBox(
      height: 200, // Increased height for image + text
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: songs.length,
        itemBuilder: (context, index) {
          final song = songs[index];
          return Container(
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
          );
        },
      ),
    );
  }
}
