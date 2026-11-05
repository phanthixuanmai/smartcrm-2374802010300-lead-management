class PartError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PartError';
    this.code = code;
  }
}

const MAX_ID = 18446744073709551615n;
const REQUIRED_TEXT_FIELDS = ['part_code', 'name', 'unit'];
const ALLOWED_FIELDS = [...REQUIRED_TEXT_FIELDS, 'unit_price', 'description', 'is_active'];

function validateId(id) {
  if (typeof id !== 'string' || id.length > 20 || !/^[1-9]\d*$/.test(id)
    || BigInt(id) > MAX_ID) {
    throw new PartError('INVALID_ID', 'Part id must be a positive integer');
  }
}

function normalizePart(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new PartError('INVALID_DATA', 'request body must be a JSON object');
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      throw new PartError('INVALID_DATA', `${field} is required and must be a non-empty string`);
    }
  }
  if (body.description !== undefined && body.description !== null
    && typeof body.description !== 'string') {
    throw new PartError('INVALID_DATA', 'description must be a string or null');
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    throw new PartError('INVALID_DATA', 'is_active must be a boolean');
  }
  if (body.unit_price !== undefined
    && (typeof body.unit_price !== 'number' || !Number.isFinite(body.unit_price) || body.unit_price < 0)) {
    throw new PartError('INVALID_DATA', 'unit_price must be a non-negative number');
  }

  const unexpectedFields = Object.keys(body).filter((field) => !ALLOWED_FIELDS.includes(field));
  if (unexpectedFields.length > 0) {
    throw new PartError('INVALID_DATA', `Unexpected fields: ${unexpectedFields.join(', ')}`);
  }

  return {
    partCode: body.part_code.trim(),
    name: body.name.trim(),
    unit: body.unit.trim(),
    unitPrice: body.unit_price === undefined ? 0 : body.unit_price,
    description: body.description === undefined ? null : body.description,
    isActive: body.is_active === undefined ? true : body.is_active
  };
}

function createPartsService(repository) {
  return {
    list() {
      return repository.list();
    },

    async get(id) {
      validateId(id);
      const part = await repository.findById(id);
      if (!part) {
        throw new PartError('PART_NOT_FOUND', 'Part not found');
      }
      return part;
    },

    async create(body) {
      try {
        return await repository.create(normalizePart(body));
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new PartError('DUPLICATE_PART_CODE', 'A part with this part_code already exists');
        }
        throw error;
      }
    },

    async update(id, body) {
      validateId(id);
      const part = normalizePart(body);
      try {
        const updated = await repository.update(id, part);
        if (!updated) {
          throw new PartError('PART_NOT_FOUND', 'Part not found');
        }
        return updated;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new PartError('DUPLICATE_PART_CODE', 'A part with this part_code already exists');
        }
        throw error;
      }
    },

    async delete(id) {
      validateId(id);
      if (!await repository.delete(id)) {
        throw new PartError('PART_NOT_FOUND', 'Part not found');
      }
    }
  };
}

module.exports = { PartError, createPartsService };
