import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../widgets/subscription_form.dart';

class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({super.key});

  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen> {
  List<dynamic> _subscriptions = [];
  bool _isLoading = true;
  String _errorMsg = '';

  @override
  void initState() {
    super.initState();
    _fetchSubscriptions();
  }

  Future<void> _fetchSubscriptions() async {
    setState(() { _isLoading = true; });
    try {
      final response = await http.get(Uri.parse('http://10.0.2.2:8000/subscriptions'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'] as List<dynamic>;
        // Sort by next payment date
        data.sort((a, b) => (a['next_payment_date'] ?? '').compareTo(b['next_payment_date'] ?? ''));
        setState(() {
          _subscriptions = data;
          _isLoading = false;
        });
      } else {
        setState(() { _errorMsg = 'Failed to load subscriptions'; _isLoading = false; });
      }
    } catch (e) {
      setState(() { _errorMsg = 'Error: $e'; _isLoading = false; });
    }
  }

  Future<void> _deleteSubscription(String subId) async {
    try {
      final response = await http.delete(Uri.parse('http://10.0.2.2:8000/delete_subscription/$subId'));
      if (response.statusCode == 200) {
        _fetchSubscriptions();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showSubscriptionForm({Map<String, dynamic>? subscription}) {
    showDialog(
      context: context,
      builder: (_) => SubscriptionForm(
        subscription: subscription,
        onSaved: _fetchSubscriptions,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_errorMsg.isNotEmpty) return Center(child: Text(_errorMsg));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscriptions', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _showSubscriptionForm),
        ],
      ),
      body: _subscriptions.isEmpty
          ? const Center(child: Text('No active subscriptions. Tap + to add one.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _subscriptions.length,
              itemBuilder: (context, index) {
                final sub = _subscriptions[index];
                final name = sub['name'] ?? 'Unknown';
                final amount = (sub['amount'] as num?)?.toDouble() ?? 0.0;
                final cycle = sub['billing_cycle'] ?? 'monthly';
                final nextDate = sub['next_payment_date'] ?? 'Unknown';
                
                return Card(
                  elevation: 2,
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Colors.blueAccent,
                      child: Icon(Icons.subscriptions, color: Colors.white),
                    ),
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Due: $nextDate • $cycle'),
                    trailing: Text(
                      '₹${amount.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    onTap: () => _showSubscriptionForm(subscription: sub),
                    onLongPress: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Delete?'),
                          content: const Text('Are you sure you want to delete this subscription?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                _deleteSubscription(sub['id'].toString());
                              },
                              child: const Text('Delete', style: TextStyle(color: Colors.red)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
}
