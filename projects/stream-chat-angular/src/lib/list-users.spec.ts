import { listUsers } from './list-users';

describe('listUsers', () => {
  it('should return the correct result if called with empty array', () => {
    expect(listUsers([])).toBe('');
  });

  it('should return the correct result if called with two users', () => {
    expect(
      listUsers([
        { id: 'id1', name: 'Sara' },
        { id: 'id2', name: 'Jane' },
      ])
    ).toBe('Sara, Jane');
  });

  it('should return correct result if user has no name, the fallback should be id', () => {
    expect(listUsers([{ id: 'id1' }, { id: 'id2', name: 'Jane' }])).toBe(
      'id1, Jane'
    );
  });

  it(`should return the correct result if called with one user`, () => {
    expect(listUsers([{ id: 'id2', name: 'Jane' }])).toBe('Jane');
  });

  it('should return the correct result if called with more than two users, but less or equal than five', () => {
    const readBy = [
      { id: 'id1', name: 'Bob' },
      { id: 'id2', name: 'Sophie' },
      { id: 'id3', name: 'Jack' },
      { id: 'id4', name: 'Rose' },
      { id: 'id5', name: 'John' },
    ];

    expect(listUsers(readBy)).toBe('Bob, Sophie, Jack, Rose, John');
  });

  it('should return the correct result if called with more than five users', () => {
    const readBy = [
      { id: 'id1', name: 'Bob' },
      { id: 'id2', name: 'Sophie' },
      { id: 'id3', name: 'Jack' },
      { id: 'id4', name: 'Rose' },
      { id: 'id5', name: 'John' },
      { id: 'id6', name: 'Adam' },
    ];

    expect(listUsers(readBy)).toBe('Bob, Sophie, Jack, Rose, John +1');
  });
});
