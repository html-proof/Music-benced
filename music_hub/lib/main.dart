import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:music_hub/core/theme/app_theme.dart';
import 'package:music_hub/features/auth/auth_service.dart';
import 'package:music_hub/features/auth/login_screen.dart';
import 'package:music_hub/features/home/home_screen.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:music_hub/firebase_options.dart';
import 'services/audio/audio_service.dart';

// Providers
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.value != null;
      final isLoginRoute = state.uri.toString() == '/login';

      if (!isLoggedIn && !isLoginRoute) {
        return '/login';
      }

      if (isLoggedIn && isLoginRoute) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(), // To be implemented
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
  
  final audioHandler = await initAudioService();

  runApp(
    ProviderScope(
      overrides: [
        audioHandlerProvider.overrideWithValue(audioHandler),
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
