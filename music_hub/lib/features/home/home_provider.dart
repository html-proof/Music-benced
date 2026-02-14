import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/song.dart';
import '../../services/api/api_service.dart';
import '../../features/auth/auth_service.dart';

class HomeData {
  final List<Song> recentlyPlayed;
  final List<Song> madeForYou;
  final List<Song> trendingNow;

  HomeData({
    required this.recentlyPlayed,
    required this.madeForYou,
    required this.trendingNow,
  });
}

final homeProvider = FutureProvider<HomeData>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final user = ref.watch(authStateProvider).value;

  // Fetch recommendations (Made For You)
  final recommendationsResponse = await apiService.get('/recommendations', queryParameters: {
    'uid': user?.uid,
  });
  final madeForYou = (recommendationsResponse as List)
      .map((e) => Song.fromJson(e))
      .toList();

  // Fetch trending (Trending Now) - reusing recommendations for now with a specific query if needed, 
  // or just fetching a fixed playlist. For this MVP, let's allow the backend to decide or use a search query.
  // We'll use a search for "trending" for now as per plan.
  final trendingResponse = await apiService.get('/search', queryParameters: {'q': 'trending music'});
  final trendingNow = (trendingResponse as List)
      .map((e) => Song.fromJson(e))
      .toList();

  // Recently Played - currently backend might not persist this effectively for new users,
  // so we'll leave it empty or mock it for now until history is implemented.
  // Or if we want to show something, maybe "new releases".
  // Let's just use another search for "new music" for the first section to have data.
  final newMusicResponse = await apiService.get('/search', queryParameters: {'q': 'new music'});
  final recentlyPlayed = (newMusicResponse as List)
      .map((e) => Song.fromJson(e))
      .toList();

  return HomeData(
    recentlyPlayed: recentlyPlayed,
    madeForYou: madeForYou,
    trendingNow: trendingNow,
  );
});
