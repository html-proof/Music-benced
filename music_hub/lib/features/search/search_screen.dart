import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'search_provider.dart';
import '../player/player_provider.dart';

class SearchScreen extends ConsumerWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchState = ref.watch(searchProvider);
    final searchNotifier = ref.read(searchProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'What do you want to listen to?',
            border: InputBorder.none,
            hintStyle: TextStyle(color: Colors.white70),
          ),
          style: const TextStyle(color: Colors.white),
          onChanged: (value) {
            searchNotifier.search(value);
          },
        ),
      ),
      body: searchState.when(
        data: (songs) {
          if (songs.isEmpty) {
            return const Center(
              child: Text('Play what you love'),
            );
          }
          return ListView.builder(
            itemCount: songs.length,
            itemBuilder: (context, index) {
              final song = songs[index];
              return ListTile(
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    song.thumbnail, 
                    width: 50, 
                    height: 50, 
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => 
                        Container(width: 50, height: 50, color: Colors.grey[800], child: const Icon(Icons.music_note)),
                  ),
                ),
                title: Text(song.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(song.artist, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: Text(song.duration, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                onTap: () {
                  ref.read(playerProvider.notifier).playSongFromList(songs, index);
                },
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}

