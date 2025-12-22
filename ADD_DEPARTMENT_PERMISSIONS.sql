-- Add department permissions system
-- This allows restaurant managers to control what sections each department can access

CREATE TABLE IF NOT EXISTS department_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  department_name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, department_name)
);

CREATE INDEX idx_department_permissions_restaurant ON department_permissions(restaurant_id);
CREATE INDEX idx_department_permissions_department ON department_permissions(restaurant_id, department_name);

-- Insert default permissions for predefined departments
-- These will be created for all existing restaurants

-- Kitchen: Only needs kitchen orders
INSERT INTO department_permissions (restaurant_id, department_name, permissions)
SELECT
  id as restaurant_id,
  'kitchen' as department_name,
  '["orders_kitchen"]'::jsonb as permissions
FROM restaurants
ON CONFLICT (restaurant_id, department_name) DO NOTHING;

-- Bar: Needs bar orders, tables, reservations
INSERT INTO department_permissions (restaurant_id, department_name, permissions)
SELECT
  id as restaurant_id,
  'bar' as department_name,
  '["orders_bar", "tables", "reservations", "report_loss"]'::jsonb as permissions
FROM restaurants
ON CONFLICT (restaurant_id, department_name) DO NOTHING;

-- Universal: Has access to everything (staff-level access)
INSERT INTO department_permissions (restaurant_id, department_name, permissions)
SELECT
  id as restaurant_id,
  'universal' as department_name,
  '["overview", "orders_kitchen", "orders_bar", "tables", "reservations", "report_loss", "my_rota", "my_availability"]'::jsonb as permissions
FROM restaurants
ON CONFLICT (restaurant_id, department_name) DO NOTHING;

-- Available permission types:
-- "overview" - Dashboard overview
-- "orders_kitchen" - Kitchen orders management (only see kitchen orders)
-- "orders_bar" - Bar orders management (only see bar orders)
-- "tables" - Table management and QR codes
-- "reservations" - Reservations management
-- "menu" - Menu management (owners/admins only)
-- "stock" - Stock management (owners/admins only)
-- "report_loss" - Report loss functionality
-- "my_rota" - View own rota (staff)
-- "my_availability" - Manage own availability (staff)
-- "analytics" - Analytics pages (owners/admins only)
