import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_client.dart';

class AddExpenseScreen extends StatefulWidget {
  const AddExpenseScreen({super.key});

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _amountController = TextEditingController();
  final _merchantController = TextEditingController();

  String _txType = 'debit'; // 'debit' for Expense, 'credit' for Income
  DateTime _selectedDate = DateTime.now();

  final List<String> _expenseCategories = [
    'Food', 'Shopping', 'Transport', 'Bills',
    'Entertainment', 'Transfer', 'Travel', 'Health', 'Other'
  ];

  final List<String> _incomeCategories = [
    'Salary', 'Freelance', 'Investment', 'Gift',
    'Refund', 'Transfer', 'Other'
  ];

  late String _selectedCategory;
  bool _isSubmitting = false;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _selectedCategory = _expenseCategories[0];
  }

  List<String> get _currentCategories =>
      _txType == 'credit' ? _incomeCategories : _expenseCategories;

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _scanReceipt() async {
    final ImageSource? source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'Privacy Notice: Receipts are securely processed by a third-party AI provider to extract transaction details.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take a Photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final ImagePicker picker = ImagePicker();
    final XFile? pickedFile = await picker.pickImage(source: source, imageQuality: 70);

    if (pickedFile == null) return;

    setState(() {
      _isScanning = true;
    });

    try {
      final res = await ApiClient.multipartPost(
        '/scan_receipt',
        fileField: 'file',
        filePath: pickedFile.path,
      );

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final data = body['data'] as Map<String, dynamic>? ?? {};

        setState(() {
          _txType = 'debit';
          if (data['merchant'] != null) {
            _merchantController.text = data['merchant'].toString();
          }
          if (data['amount'] != null) {
            _amountController.text = data['amount'].toString();
          }
          if (data['date'] != null) {
            try {
              _selectedDate = DateTime.parse(data['date'].toString());
            } catch (_) {}
          }
          if (data['category'] != null) {
            final parsedCat = data['category'].toString();
            final matched = _expenseCategories.firstWhere(
              (c) => c.toLowerCase() == parsedCat.toLowerCase(),
              orElse: () => 'Other',
            );
            _selectedCategory = matched;
          }
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Receipt scanned successfully! Please review the details.'),
              backgroundColor: Colors.teal,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Scan failed (${res.statusCode}): ${res.body}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error scanning receipt: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isScanning = false;
        });
      }
    }
  }

  Future<void> _submitTransaction() async {
    final amountText = _amountController.text.trim();
    final merchant = _merchantController.text.trim();

    if (amountText.isEmpty || merchant.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields')),
      );
      return;
    }

    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid positive amount')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final formattedDate =
        "${_selectedDate.year.toString().padLeft(4, '0')}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}";

    try {
      final response = await ApiClient.post(
        '/add_transaction',
        body: {
          'amount': amount,
          'merchant': merchant,
          'category': _selectedCategory,
          'type': _txType,
          'date': formattedDate,
        },
      );

      if (response.statusCode == 200) {
        if (!mounted) return;
        final label = _txType == 'credit' ? 'Income' : 'Expense';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$label added successfully!'),
            backgroundColor: _txType == 'credit' ? Colors.teal : Colors.blue,
          ),
        );
        _amountController.clear();
        _merchantController.clear();
        setState(() {
          _selectedDate = DateTime.now();
          _selectedCategory = _currentCategories[0];
        });
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to add transaction')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCredit = _txType == 'credit';
    final primaryColor = isCredit ? Colors.teal : Colors.blue;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          isCredit ? 'Add Money Received' : 'Add Expense',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        actions: [
          if (!isCredit) // Only make sense to scan receipts for expenses
            _isScanning
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16.0),
                    child: Center(
                      child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                    ),
                  )
                : IconButton(
                    icon: const Icon(Icons.document_scanner),
                    tooltip: 'Scan Receipt',
                    onPressed: _scanReceipt,
                  ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Type Selector: Expense vs Income
            Container(
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _txType = 'debit';
                          _selectedCategory = _expenseCategories[0];
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: !isCredit ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: !isCredit
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withAlpha(20),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.arrow_upward,
                              size: 18,
                              color: !isCredit ? Colors.redAccent : Colors.grey,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Expense',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: !isCredit ? Colors.black87 : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _txType = 'credit';
                          _selectedCategory = _incomeCategories[0];
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isCredit ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: isCredit
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withAlpha(20),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.arrow_downward,
                              size: 18,
                              color: isCredit ? Colors.teal : Colors.grey,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Income (Received)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isCredit ? Colors.teal : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Amount Input
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                labelText: 'Amount',
                prefixText: '₹ ',
                prefixStyle: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: primaryColor,
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),

            // Merchant / Payer Input
            TextField(
              controller: _merchantController,
              decoration: InputDecoration(
                labelText: isCredit ? 'Received From (Payer / Source)' : 'Paid To (Merchant / Person)',
                hintText: isCredit ? 'e.g. Salary, Amit, Upwork' : 'e.g. Swiggy, Uber, Rent',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),

            // Category Dropdown
            DropdownButtonFormField<String>(
              initialValue: _selectedCategory,
              decoration: InputDecoration(
                labelText: 'Category',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              items: _currentCategories.map((cat) {
                return DropdownMenuItem(
                  value: cat,
                  child: Text(cat),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedCategory = val;
                  });
                }
              },
            ),
            const SizedBox(height: 16),

            // Date Picker Card
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 20, color: primaryColor),
                        const SizedBox(width: 12),
                        Text(
                          "Date: ${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}",
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const Text('Change', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSubmitting ? null : _submitTransaction,
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        isCredit ? 'Add Income (+)' : 'Add Expense (-)',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
