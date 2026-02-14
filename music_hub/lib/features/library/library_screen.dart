import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Your Library'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Playlists'),
              Tab(text: 'Liked Songs'),
            ],
            indicatorColor: Color(0xFF1DB954),
          ),
        ),
        body: const TabBarView(
          children: [
            Center(child: Text('Playlists content')),
            Center(child: Text('Liked Songs content')),
          ],
        ),
      ),
    );
  }
}
