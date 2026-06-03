export type EmployeeRole =
  | "owner"
  | "manager"
  | "cook"
  | "bar"
  | "waiter"
  | "dishwasher"
  | "other";

export type Employee = {
  id: string;
  display_name: string;
  role: EmployeeRole;
  is_active: boolean;
};

export type Service = {
  id: string;
  code: string;
  title: string;
  url: string;
  is_active: boolean;
  can_view: boolean;
  can_edit: boolean;
};

