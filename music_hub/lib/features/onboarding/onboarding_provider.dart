import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:music_hub/services/api/api_service.dart';
import 'package:music_hub/features/auth/auth_service.dart';

/// Local override: once onboarding is completed in-app, set this to true
/// so the router doesn't need to wait for a backend re-fetch.
final onboardingCompletedLocalProvider = StateProvider<bool?>((ref) => null);

/// Checks if the current user has completed onboarding.
/// First checks the local override, then falls back to the backend check.
final onboardingStatusProvider = FutureProvider<bool>((ref) async {
  // If we already completed onboarding in this session, return true immediately
  final localOverride = ref.watch(onboardingCompletedLocalProvider);
  if (localOverride == true) return true;

  // Wait for auth state to be available
  final user = ref.watch(authStateProvider).value;
  if (user == null) return false;

  // Ensure token is set before making the API call
  final apiService = ref.read(apiServiceProvider);
  final token = await user.getIdToken();
  apiService.setAuthToken(token ?? '');

  try {
    final response = await apiService.get('/user/profile');
    return response['hasCompletedOnboarding'] == true;
  } catch (e) {
    // If backend is unavailable, assume not onboarded to be safe
    return false;
  }
});


