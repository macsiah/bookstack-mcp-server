import { ValidationHandler } from '../../src/validation/validator';

describe('ValidationHandler', () => {
  let validator: ValidationHandler;

  beforeEach(() => {
    validator = new ValidationHandler({ enabled: true, strictMode: true });
  });

  describe('validateId', () => {
    it('should return a valid positive integer', () => {
      expect(validator.validateId(5)).toBe(5);
      expect(validator.validateId('10')).toBe(10);
    });

    it('should throw for zero or negative ids', () => {
      expect(() => validator.validateId(0)).toThrow();
      expect(() => validator.validateId(-1)).toThrow();
    });
  });

  describe('validateParams - booksList', () => {
    it('should apply defaults', () => {
      const result = validator.validateParams<any>({}, 'booksList');
      expect(result.count).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.sort).toBe('name');
    });

    it('should accept valid values', () => {
      const result = validator.validateParams<any>({ count: 50, sort: 'updated_at' }, 'booksList');
      expect(result.count).toBe(50);
    });

    it('should reject invalid sort field', () => {
      expect(() => validator.validateParams({ sort: 'invalid_field' }, 'booksList')).toThrow();
    });
  });

  describe('validateParams - export', () => {
    it('should pass valid format values', () => {
      for (const fmt of ['html', 'pdf', 'plaintext', 'markdown']) {
        const result = validator.validateParams<any>({ id: 1, format: fmt }, 'export');
        expect(result.format).toBe(fmt);
      }
    });

    it('should reject invalid format', () => {
      expect(() => validator.validateParams({ id: 1, format: 'docx' }, 'export')).toThrow();
    });
  });

  describe('validateParams - userCreate', () => {
    it('should accept external_auth_id', () => {
      const result = validator.validateParams<any>(
        { name: 'Alice', email: 'alice@example.com', external_auth_id: 'ldap-123' },
        'userCreate'
      );
      expect(result.external_auth_id).toBe('ldap-123');
    });

    it('should require name and email', () => {
      expect(() => validator.validateParams({ email: 'a@b.com' }, 'userCreate')).toThrow();
      expect(() => validator.validateParams({ name: 'Alice' }, 'userCreate')).toThrow();
    });
  });

  describe('validateParams - contentPermissionsUpdate', () => {
    it('should accept permissions with role_id', () => {
      const result = validator.validateParams<any>(
        { permissions: [{ role_id: 1, view: true, create: false, update: false, delete: false }] },
        'contentPermissionsUpdate'
      );
      expect(result.permissions[0].role_id).toBe(1);
    });

    it('should accept permissions with user_id', () => {
      const result = validator.validateParams<any>(
        { permissions: [{ user_id: 5, view: true, create: false, update: false, delete: false }] },
        'contentPermissionsUpdate'
      );
      expect(result.permissions[0].user_id).toBe(5);
    });

    it('should reject permission entry with neither role_id nor user_id', () => {
      expect(() =>
        validator.validateParams(
          { permissions: [{ view: true, create: false, update: false, delete: false }] },
          'contentPermissionsUpdate'
        )
      ).toThrow();
    });
  });

  describe('disabled mode', () => {
    it('should pass through params without validation', () => {
      const disabledValidator = new ValidationHandler({ enabled: false, strictMode: false });
      const params = { sort: 'TOTALLY_INVALID', count: 99999 };
      const result = disabledValidator.validateParams(params, 'booksList');
      expect(result).toBe(params);
    });
  });

  describe('non-strict mode', () => {
    it('should return original params and warn on validation failure', () => {
      const nonStrictValidator = new ValidationHandler({ enabled: true, strictMode: false });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const params = { sort: 'bad_field' };
      const result = nonStrictValidator.validateParams(params, 'booksList');
      expect(result).toBe(params);
      consoleSpy.mockRestore();
    });
  });
});
