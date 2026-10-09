import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, createFile, listFiles, getFile, updateFile, renameFile, duplicateFile, deleteFile, countFiles } from '../src/storage/db.js';

beforeEach(async () => {
  await db.files.clear();
});

describe('storage — create', () => {
  it('crée un fichier avec id auto', async () => {
    const id = await createFile({ name: 'Test', code: 'x' });
    expect(typeof id).toBe('number');
    const f = await getFile(id);
    expect(f.name).toBe('Test');
    expect(f.code).toBe('x');
    expect(f.createdAt).toBeGreaterThan(0);
  });

  it('suffixe si le nom existe déjà', async () => {
    await createFile({ name: 'Test' });
    const id2 = await createFile({ name: 'Test' });
    const f2 = await getFile(id2);
    expect(f2.name).toBe('Test 2');
  });

  it('nom par défaut « Sans titre »', async () => {
    const id = await createFile({});
    const f = await getFile(id);
    expect(f.name).toBe('Sans titre');
  });
});

describe('storage — list', () => {
  it('trie du plus récent au plus ancien', async () => {
    const id1 = await createFile({ name: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    const id2 = await createFile({ name: 'B' });
    const list = await listFiles();
    expect(list[0].id).toBe(id2);
    expect(list[1].id).toBe(id1);
  });
});

describe('storage — update / rename', () => {
  it('met à jour le code', async () => {
    const id = await createFile({ name: 'X', code: 'old' });
    await updateFile(id, { code: 'new' });
    const f = await getFile(id);
    expect(f.code).toBe('new');
  });

  it('renomme avec unicité', async () => {
    await createFile({ name: 'A' });
    const idB = await createFile({ name: 'B' });
    await renameFile(idB, 'A');
    const f = await getFile(idB);
    expect(f.name).toBe('A 2');
  });
});

describe('storage — duplicate', () => {
  it('copie le contenu', async () => {
    const id = await createFile({ name: 'X', code: 'abc' });
    const newId = await duplicateFile(id);
    const copy = await getFile(newId);
    expect(copy.name).toBe('X 2');
    expect(copy.code).toBe('abc');
    expect(newId).not.toBe(id);
  });
});

describe('storage — delete', () => {
  it('supprime un fichier', async () => {
    const id = await createFile({ name: 'X' });
    await deleteFile(id);
    expect(await countFiles()).toBe(0);
  });
});