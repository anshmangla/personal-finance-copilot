import 'package:url_launcher/url_launcher.dart';
import 'api_config.dart';

class ExportService {
  static String get baseUrl => ApiConfig.baseUrl;

  static Future<void> exportCsv() async {
    final url = Uri.parse('$baseUrl/export/csv');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }

  static Future<void> exportPdf() async {
    final url = Uri.parse('$baseUrl/export/pdf');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }
}
