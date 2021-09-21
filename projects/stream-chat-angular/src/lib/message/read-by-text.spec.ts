import { getReadByText } from './read-by-text';

describe('getReadByText', () => {
  it('should return the read by text, if no one read the message', () => {
    expect(getReadByText([])).toBe('');
  });

  it('should return the read by text, if two people read the message', () => {
    expect(
      getReadByText([
        { id: 'id1', name: 'Sara' },
        { id: 'id2', name: 'Jane' },
      ])
    ).toBe('Sara and Jane');
  });

  it('should return the read by text, if user has no name, use id as a fallback', () => {
    expect(getReadByText([{ id: 'id1' }, { id: 'id2', name: 'Jane' }])).toBe(
      'id1 and Jane'
    );
  });

  it(`should return the read by text if only one user read the message`, () => {
    expect(getReadByText([{ id: 'id2', name: 'Jane' }])).toBe('Jane ');
  });

  it('should return the read by text, if more than two people read the message, but less or equal than five', () => {
    const readBy = [
      { id: 'id1', name: 'Bob' },
      { id: 'id2', name: 'Sophie' },
      { id: 'id3', name: 'Jack' },
      { id: 'id4', name: 'Rose' },
      { id: 'id5', name: 'John' },
    ];

    expect(getReadByText(readBy)).toBe('Bob, Sophie, Jack, John, and Rose');
  });

  it('should return the read by text, if more than five people read the message', () => {
    const readBy = [
      { id: 'id1', name: 'Bob' },
      { id: 'id2', name: 'Sophie' },
      { id: 'id3', name: 'Jack' },
      { id: 'id4', name: 'Rose' },
      { id: 'id5', name: 'John' },
      { id: 'id6', name: 'Adam' },
    ];

    expect(getReadByText(readBy)).toBe(
      'Bob, Sophie, Jack, Rose, John and 1 more'
    );
  });
});
