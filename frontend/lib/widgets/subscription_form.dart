import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class SubscriptionForm extends StatefulWidget {
  final Map<String, dynamic>? subscription;
  final VoidCallback onSaved;

  const SubscriptionForm({Key? key, this.subscription, required this.onSaved}) : super(key: key);

  @override
  State<SubscriptionForm> createState() => _SubscriptionFormState();
}

class _SubscriptionFormState extends State<SubscriptionForm> {
  late TextEditingController _nameController;
  late TextEditingController _amountController;
  late TextEditingController _dateController;
  String _billingCycle = 'monthly';
  String _category = 'Entertainment';

  final List<String> _categories = [
    'Food', 'Shopping', 'Transport', 'Bills',
    'Entertainment', 'Travel', 'Other'
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.subscription?['name'] ?? '');
    _amountController = TextEditingController(text: widget.subscription?['amount']?.toString() ?? '');
    _dateController = TextEditingController(text: widget.subscription?['next_payment_date'] ?? '');
    if (widget.subscription != null) {
      _billingCycle = widget.subscription!['billing_cycle'] ?? 'monthly';
      _category = widget.subscription!['category'] ?? 'Entertainment';
      if (!_categories.contains(_category)) {
        _category = 'Other';
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
    );
    if (picked != null) {
      setState(() {
        _dateController.text = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      });
    }
  }

  Future<void> _saveSubscription() async {
    final name = _nameController.text.trim();
    final amount = double.tryParse(_amountController.text.trim());
    final date = _dateController.text.trim();

    if (name.isEmpty || amount == null || amount <= 0 || date.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all valid details')));
      return;
    }

    final isEditing = widget.subscription != null;
    final url = isEditing 
        ? 'http://10.0.2.2:8000/edit_subscription' 
        : 'http://10.0.2.2:8000/add_subscription';

    final body = {
      if (isEditing) 'id': widget.subscription!['id'],
      'name': name,
      'amount': amount,
      'category': _category,
      'billing_cycle': _billingCycle,
      'next_payment_date': date,
    };

    try {
      final response = isEditing 
          ? await http.put(Uri.parse(url), headers: {'Content-Type': 'application/json'}, body: jsonEncode(body))
          : await http.post(Uri.parse(url), headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));

      if (response.statusCode == 200) {
        if (!mounted) return;
        Navigator.pop(context);
        widget.onSaved();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save subscription')));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.subscription == null ? 'Add Subscription' : 'Edit Subscription'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Service Name (e.g., Netflix)'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Amount (₹)'),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (val) => setState(() => _category = val!),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _billingCycle,
              decoration: const InputDecoration(labelText: 'Billing Cycle'),
              items: const [
                DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                DropdownMenuItem(value: 'yearly', child: Text('Yearly')),
              ],
              onChanged: (val) => setState(() => _billingCycle = val!),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _dateController,
              decoration: const InputDecoration(labelText: 'Next Payment Date (YYYY-MM-DD)'),
              readOnly: true,
              onTap: () => _selectDate(context),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(onPressed: _saveSubscription, child: const Text('Save')),
      ],
    );
  }
}
