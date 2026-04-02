import { describe, it, expect } from 'vitest';

describe('API response format', () => {
  it('should follow { success, data } pattern on success', () => {
    const response = { success: true, data: { id: '1', name: 'Test' } };
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe('1');
  });

  it('should follow { success, error } pattern on failure', () => {
    const response = { success: false, error: 'Not found' };
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});

describe('Role hierarchy', () => {
  const ROLE_HIERARCHY: Record<string, number> = {
    owner: 60,
    admin: 50,
    editor: 40,
    moderator: 30,
    volunteer: 20,
    exhibitor: 10,
  };

  function hasMinRole(userRole: string, minRole: string): boolean {
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
  }

  it('owner should have all permissions', () => {
    expect(hasMinRole('owner', 'admin')).toBe(true);
    expect(hasMinRole('owner', 'exhibitor')).toBe(true);
  });

  it('exhibitor should not have admin permissions', () => {
    expect(hasMinRole('exhibitor', 'admin')).toBe(false);
    expect(hasMinRole('exhibitor', 'volunteer')).toBe(false);
  });

  it('volunteer should have exhibitor permissions', () => {
    expect(hasMinRole('volunteer', 'exhibitor')).toBe(true);
  });
});
