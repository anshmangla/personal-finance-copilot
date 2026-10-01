class ApiConfig {
  // Use http://10.0.2.2:8000 for Android Emulator local testing.
  // Replace with your Render URL (e.g. 'https://financecopilot.onrender.com') when deployed.
  static const String _url = 'https://finance-copilot-backend-p7p1.onrender.com';
  static String get baseUrl => _url.endsWith('/') ? _url.substring(0, _url.length - 1) : _url;

  // Paste your Google OAuth Web Client ID here (from Google Cloud Console)
  // e.g. '123456789-abcdefgh.apps.googleusercontent.com'
  static const String googleWebClientId = '36258186359-uh4vnk86fv3eoonm3hq2q986lrungpf7.apps.googleusercontent.com';
}
