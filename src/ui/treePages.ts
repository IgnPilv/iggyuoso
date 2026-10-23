import type { BranchId } from '../content/tree';
import type { View } from './dom';
import { branchPage, songsPage } from './treeView';

// Routes for the tree's own pages: #/branch/<id> and #/songs.

export const branchView: View = (root, id) => { root.append(branchPage((id ?? 'technique') as BranchId)); };
export const songsView: View = (root) => { root.append(songsPage()); };
