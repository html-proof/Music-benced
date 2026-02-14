import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:music_hub/core/theme/app_theme.dart';
import 'package:music_hub/features/auth/auth_service.dart';
import 'package:music_hub/features/auth/login_screen.dart';
import 'package:music_hub/features/home/home_screen.dart';
import 'package:music_hub/features/onboarding/onboarding_screen.dart';
import 'package:music_hub/features/onboarding/onboarding_provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:music_hub/firebase_options.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:music_hub/services/cache/cache_service.dart';
import 'services/audio/audio_service.dart';

// Providers
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final onboardingStatus = ref.watch(onboardingStatusProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.value != null;
      final isLoginRoute = state.uri.toString() == '/login';
      final isOnboardingRoute = state.uri.toString() == '/onboarding';

      // Not logged in → login
      if (!isLoggedIn && !isLoginRoute) {
        return '/login';
      }

      // Logged in + on login page → check onboarding
      if (isLoggedIn && isLoginRoute) {
        final hasOnboarded = onboardingStatus.value ?? false;
        return hasOnboarded ? '/' : '/onboarding';
      }

      // Logged in + trying to go home but hasn't onboarded
      if (isLoggedIn && !isOnboardingRoute && !isLoginRoute) {
        final hasOnboarded = onboardingStatus.value ?? false;
        if (!hasOnboarded && onboardingStatus.hasValue) {
          return '/onboarding';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      // Add other routes here (Search, Library, etc.)
    ],
  );
});


void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Initialize Hive
  await Hive.initFlutter();
  
  final audioHandler = await initAudioService();
  
  // Initialize Cache Service
  final cacheService = CacheService();
  await cacheService.init();

  runApp(
    ProviderScope(
      overrides: [
        audioHandlerProvider.overrideWithValue(audioHandler),
        cacheServiceProvider.overrideWithValue(cacheService),
      ],
      child: const MusicHubApp(),
    ),
  );
}

class MusicHubApp extends ConsumerWidget {
  const MusicHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Music Hub',
      theme: AppTheme.darkTheme,
      routerConfig: router,
    );
  }
}
