INSERT INTO employee_service_access (employee_id, service_id, can_view, can_edit)
SELECT e.id, s.id, true, false
FROM employees e
JOIN services s ON s.code = 'payroll'
WHERE e.is_active = true
ON CONFLICT (employee_id, service_id) DO UPDATE
SET can_view = true;
