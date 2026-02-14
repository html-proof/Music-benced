import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:music_hub/core/theme/app_theme.dart';
import 'package:music_hub/features/onboarding/onboarding_provider.dart';
import 'package:music_hub/services/api/api_service.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  bool _isSaving = false;

  final List<String> _languages = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
    'Malayalam', 'Punjabi', 'Bengali', 'Marathi', 'Gujarati',
    'Korean', 'Japanese', 'Spanish', 'French', 'Arabic',
  ];

  final List<String> _moods = [
    'Happy', 'Chill', 'Energetic', 'Romantic', 'Sad',
    'Workout', 'Focus', 'Party', 'Sleep', 'Road Trip',
    'Devotional', 'Classical', 'Hip Hop', 'Lo-Fi', 'Rock',
  ];

  final Set<String> _selectedLanguages = {};
  final Set<String> _selectedMoods = {};

  void _nextPage() {
    if (_currentPage == 0 && _selectedLanguages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one language')),
      );
      return;
    }
    _pageController.nextPage(
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _finish() async {
    if (_selectedMoods.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one mood')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final apiService = ref.read(apiServiceProvider);
      await Future.wait([
        apiService.post('/user/language', data: {'language': _selectedLanguages.toList()}),
        apiService.post('/user/moods', data: {'moods': _selectedMoods.toList()}),
      ]);
    } catch (e) {
      // Save failed (backend issue), but still proceed to home
      debugPrint('Onboarding save error: $e');
    }

    // Mark onboarding as done locally so the router navigates to home
    ref.read(onboardingCompletedLocalProvider.notifier).state = true;
    ref.invalidate(onboardingStatusProvider);

    if (mounted) {
      setState(() => _isSaving = false);
      context.go('/');
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1A1A2E), Color(0xFF0A0A0A)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Progress indicator
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  children: [
                    _buildDot(0),
                    const SizedBox(width: 8),
                    _buildDot(1),
                  ],
                ),
              ),

              // Pages
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (i) => setState(() => _currentPage = i),
                  children: [
                    _buildLanguagePage(),
                    _buildMoodPage(),
                  ],
                ),
              ),

              // Bottom button
              Padding(
                padding: const EdgeInsets.all(24),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isSaving
                        ? null
                        : (_currentPage == 0 ? _nextPage : _finish),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(28),
                      ),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            width: 24, height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.black,
                            ),
                          )
                        : Text(
                            _currentPage == 0 ? 'Continue' : 'Get Started',
                            style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDot(int index) {
    final isActive = _currentPage == index;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: isActive ? 32 : 12,
      height: 6,
      decoration: BoxDecoration(
        color: isActive ? AppTheme.primary : AppTheme.textSecondary.withOpacity(0.3),
        borderRadius: BorderRadius.circular(3),
      ),
    );
  }

  Widget _buildLanguagePage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          const Text(
            'Choose your\nlanguages 🌍',
            style: TextStyle(
              fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'We\'ll recommend music in these languages',
            style: TextStyle(fontSize: 16, color: Colors.white.withOpacity(0.6)),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: SingleChildScrollView(
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _languages.map((lang) => _buildChip(
                  label: lang,
                  selected: _selectedLanguages.contains(lang),
                  onTap: () {
                    setState(() {
                      _selectedLanguages.contains(lang)
                          ? _selectedLanguages.remove(lang)
                          : _selectedLanguages.add(lang);
                    });
                  },
                )).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMoodPage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          const Text(
            'What\'s your\nvibe? 🎧',
            style: TextStyle(
              fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Pick moods to personalize your recommendations',
            style: TextStyle(fontSize: 16, color: Colors.white.withOpacity(0.6)),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: SingleChildScrollView(
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _moods.map((mood) => _buildChip(
                  label: mood,
                  selected: _selectedMoods.contains(mood),
                  onTap: () {
                    setState(() {
                      _selectedMoods.contains(mood)
                          ? _selectedMoods.remove(mood)
                          : _selectedMoods.add(mood);
                    });
                  },
                )).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary : Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? AppTheme.primary : Colors.white.withOpacity(0.15),
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.black : Colors.white,
            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
            fontSize: 15,
          ),
        ),
      ),
    );
  }
}
