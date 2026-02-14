import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/song.dart';
import '../../services/api/api_service.dart';

class HomeData {
  final List<Song> recentlyPlayed; // This is actually New Releases based on backend logic
  final List<Song> madeForYou;
  final List<Song> trendingNow;
  
  final String madeForYouTitle;
  final String trendingNowTitle;
  final String recentlyPlayedTitle;

  HomeData({
    required this.recentlyPlayed,
    required this.madeForYou,
    required this.trendingNow,
    this.madeForYouTitle = 'Made For You',
    this.trendingNowTitle = 'Trending Now',
    this.recentlyPlayedTitle = 'New Releases',
  });
}

final homeProvider = FutureProvider<HomeData>((ref) async {
  final apiService = ref.watch(apiServiceProvider);

  // Single call — backend reads user's language + moods and returns personalized results
  // We pass the local hour so the greeting/context title matches the USER'S time, not server time.
  final localHour = DateTime.now().hour;
  final response = await apiService.get('/home', queryParameters: {'localHour': localHour});
  final titles = response['titles'] ?? {};

  return HomeData(
    madeForYou: (response['madeForYou'] as List).map((e) => Song.fromJson(e)).toList(),
    trendingNow: (response['trendingNow'] as List).map((e) => Song.fromJson(e)).toList(),
    recentlyPlayed: (response['recentlyPlayed'] as List).map((e) => Song.fromJson(e)).toList(),
    
    // Dynamic titles
    madeForYouTitle: titles['madeForYou'] ?? 'Made For You',
    trendingNowTitle: titles['trendingNow'] ?? 'Trending Now',
    recentlyPlayedTitle: titles['recentlyPlayed'] ?? 'New Releases',
  );
});


