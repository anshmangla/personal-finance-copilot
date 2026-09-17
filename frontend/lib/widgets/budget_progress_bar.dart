import 'package:flutter/material.dart';

class BudgetProgressBar extends StatelessWidget {
  final String category;
  final double spent;
  final double limit;

  const BudgetProgressBar({
    Key? key,
    required this.category,
    required this.spent,
    required this.limit,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final progress = limit > 0 ? (spent / limit) : 0.0;
    final progressClamped = progress.clamp(0.0, 1.0);

    Color progressColor;
    if (progress < 0.8) {
      progressColor = Colors.green;
    } else if (progress < 1.0) {
      progressColor = Colors.orange;
    } else {
      progressColor = Colors.red;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(category, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(
              '₹${spent.toStringAsFixed(0)} / ₹${limit.toStringAsFixed(0)}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: progress >= 1.0 ? Colors.red : Colors.grey.shade700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progressClamped,
            minHeight: 12,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(progressColor),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
