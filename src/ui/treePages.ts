import type { BranchId } from '../content/tree';
import type { View } from './dom';
import { branchPage, songPage, songsPage } from './treeView';

// Routes for the tree's own pages: #/branch/<id>, #/songs and #/song/<id> (a song taught in steps).

export const branchView: View = (root, id) => { root.append(branchPage((id ?? 'technique') as BranchId)); };
export const songsView: View = (root) => { root.append(songsPage()); };
export const songView: View = (root, id) => { root.append(songPage(id ?? '')); };
