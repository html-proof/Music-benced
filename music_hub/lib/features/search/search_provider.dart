import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/song.dart';
import '../../services/api/api_service.dart';

class SearchNotifier extends StateNotifier<AsyncValue<List<Song>>> {
  final ApiService _apiService;
  Timer? _debounceTimer;

  SearchNotifier(this._apiService) : super(const AsyncValue.data([]));

  void search(String query) {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    
    // If query is empty, clear results
    if (query.trim().isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }

    // Set loading state (optional: keep previous results while loading?)
    // For now, let's keep previous results or show loading indicator depending on UI preference.
    // Making it loading clears the UI typically, which might cause flicker.
    // Let's just set loading.
    state = const AsyncValue.loading();

    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      try {
        final response = await _apiService.get('/search', queryParameters: {'q': query});
        final songs = (response as List).map((e) => Song.fromJson(e)).toList();
        
        if (mounted) {
           state = AsyncValue.data(songs);
        }
      } catch (e, st) {
        if (mounted) {
           state = AsyncValue.error(e, st);
        }
      }
    });
  }
  
  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}

final searchProvider = StateNotifierProvider<SearchNotifier, AsyncValue<List<Song>>>((ref) {
  return SearchNotifier(ref.read(apiServiceProvider));
});
