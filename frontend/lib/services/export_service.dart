import 'package:url_launcher/url_launcher.dart';

class ExportService {
  static const String baseUrl = 'http://10.0.2.2:8000';

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
