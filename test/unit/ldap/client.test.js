import Client from '../../../src/ldap/client';
import ldap from 'ldapjs';
jest.mock('ldapjs');

const fixtures = {
  basedn: 'dc=example,dc=com',
  binddn: 'uid=bind,dc=example,dc=com',
  bindpw: 'secret',
  username: 'john.doe',
  dn: 'uid=john.doe,dc=example,dc=com',
  password: 'secret',
  groups: [
    'cn=test,dc=example,dc=com',
  ],
  filter: '(uid=john.doe)',
  attributeNames: [
    'uid',
    'memberOf',
  ],
};

let connection = ldap.createClient();
let client = null;

beforeEach(() => {
  client = new Client(
    connection,
    fixtures.basedn,
    fixtures.binddn,
    fixtures.bindpw,
    true
  );
  connection.starttlsReturnsError = false;
  connection.bindReturnsError = false;
  connection.searchReturnsError = false;
  connection.searchEmitsError = false;
  connection.searchEmitsResult = true;
  connection.searchEmitsEndStatus = 0;
  connection.searchResult = {
    uid: fixtures.username,
    memberOf: fixtures.groups,
  };
});

describe('Client.bind()', () => {
  test('Resolves to true for successful bind', () => {
    expect.hasAssertions();
    return expect(
      client.bind(fixtures.dn, fixtures.password)
    ).resolves.toBe(true);
  });

  test('Resolves to false for unsuccessful bind', () => {
    connection.bindReturnsError = true;

    expect.hasAssertions();
    return expect(
      client.bind(fixtures.dn, fixtures.password)
    ).resolves.toBe(false);
  });

  test('Rejects on unprotected connection', () => {
    client._secure = false;

    expect.hasAssertions();
    return expect(
      client.bind(fixtures.dn, fixtures.password)
    ).rejects.toEqual(new Error(
      'ldap connection not tls protected'
    ));
  });
});

describe('Client.search()', () => {
  test('Rejects on bind error', () => {
    connection.bindReturnsError = true;

    expect.hasAssertions();
    return expect(
      client.search(fixtures.filter)
    ).rejects.toEqual(new Error('error by mock'));
  });

  test('Rejects on search error', () => {
    connection.searchReturnsError = true;

    expect.hasAssertions();
    return expect(
      client.search(fixtures.filter)
    ).rejects.toEqual(new Error('error by mock'));
  });

  test('Rejects on error event', () => {
    connection.searchEmitsError = true;

    expect.hasAssertions();
    return expect(
      client.search(fixtures.filter)
    ).rejects.toEqual(new Error('error by mock'));
  });

  test('Rejects on empty result', () => {
    connection.searchEmitsResult = false;

    expect.hasAssertions();
    return expect(
      client.search(fixtures.filter)
    ).rejects.toEqual(new Error(
      `no object found with filter [${fixtures.filter}]`
    ));
  });

  test('Rejects on search end with status != 0', () => {
    connection.searchEmitsEnd = true;
    connection.searchEmitsEndStatus = 1;

    expect.hasAssertions();
    return expect(
      client.search(fixtures.filter)
    ).rejects.toBe(connection.searchEmitsEndStatus);
  });

  test('Rejects on unprotected connection', () => {
    client._secure = false;

    expect.hasAssertions();
    return expect(
      client.search(fixtures.filter)
    ).rejects.toEqual(new Error(
      'ldap connection not tls protected'
    ));
  });
});
