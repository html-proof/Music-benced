import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/song.dart';

final cacheServiceProvider = Provider<CacheService>((ref) {
  return CacheService();
});

class CacheService {
  static const String _boxName = 'currnt_song_cache';
  late Box _box;

  Future<void> init() async {
    _box = await Hive.openBox(_boxName);
  }

  /// Get a cached song if it exists
  Song? getCachedSong(String videoId) {
    final data = _box.get(videoId);
    if (data != null) {
      final songMap = Map<String, dynamic>.from(data);
      // Verify file exists
      final audioPath = songMap['localAudioPath'];
      if (audioPath != null && File(audioPath).existsSync()) {
        return Song.fromJson(songMap);
      }
    }
    return null;
  }

  /// Download and cache a song in the background
  Future<void> cacheSong(Song song, String streamUrl) async {
    // If already cached, don't re-download
    if (getCachedSong(song.id) != null) return;

    try {
      final dir = await getApplicationDocumentsDirectory();
      final cacheDir = Directory('${dir.path}/songs_cache');
      if (!cacheDir.existsSync()) {
        cacheDir.createSync(recursive: true);
      }

      // 1. Download Audio
      final audioPath = '${cacheDir.path}/${song.id}.m4a';
      await Dio().download(streamUrl, audioPath);

      // 2. Download Image (Optional, but good for offline UI)
      String? imagePath;
      if (song.thumbnail.isNotEmpty) {
        try {
          final imgPath = '${cacheDir.path}/${song.id}.jpg';
          await Dio().download(song.thumbnail, imgPath);
          imagePath = imgPath;
        } catch (e) {
          // Ignore image download failure
        }
      }

      // 3. Save Metadata to Hive
      final cachedSong = Song(
        id: song.id,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        duration: song.duration,
        localAudioPath: audioPath,
        localImagePath: imagePath,
      );

      await _box.put(song.id, cachedSong.toJson());
      debugPrint('Cached song: ${song.title}');
    } catch (e) {
      debugPrint('Failed to cache song: $e');
    }
  }

  Future<void> clearCache() async {
    await _box.clear();
    final dir = await getApplicationDocumentsDirectory();
    final cacheDir = Directory('${dir.path}/songs_cache');
    if (cacheDir.existsSync()) {
      cacheDir.deleteSync(recursive: true);
    }
  }
}
