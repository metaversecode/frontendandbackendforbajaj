const VALID_EDGE_REGEX = /^[A-Z]->[A-Z]$/;

function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const validEdges = [];

  for (const raw of data) {
    const entry = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    if (!VALID_EDGE_REGEX.test(entry)) {
      invalidEntries.push(entry);
      continue;
    }

    const [parent, child] = entry.split('->');
    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) {
        duplicateEdges.push(entry);
      }
      continue;
    }

    seenEdges.add(entry);
    validEdges.push({ parent, child, raw: entry });
  }

  const adjacency = {};
  const childOf = {};
  const allNodes = new Set();

  for (const edge of validEdges) {
    allNodes.add(edge.parent);
    allNodes.add(edge.child);

    if (childOf[edge.child] !== undefined) continue;

    childOf[edge.child] = edge.parent;
    if (!adjacency[edge.parent]) adjacency[edge.parent] = [];
    adjacency[edge.parent].push(edge.child);
  }

  const visited = new Set();
  const components = [];
  const undirected = {};

  for (const node of allNodes) {
    undirected[node] = [];
  }
  for (const [child, parent] of Object.entries(childOf)) {
    undirected[parent].push(child);
    undirected[child].push(parent);
  }

  for (const node of [...allNodes].sort()) {
    if (visited.has(node)) continue;
    const component = [];
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      for (const neighbor of (undirected[current] || [])) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
    components.push(component.sort());
  }

  const hierarchies = [];

  for (const component of components) {
    const roots = component.filter(n => childOf[n] === undefined);
    const hasCycle = detectCycle(component, adjacency);

    if (hasCycle) {
      hierarchies.push({ root: component.sort()[0], tree: {}, has_cycle: true });
    } else {
      const root = roots.length > 0 ? roots.sort()[0] : component.sort()[0];
      const tree = buildTree(root, adjacency);
      hierarchies.push({ root, tree, depth: calcDepth(tree) });
    }
  }

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = '';
  let maxDepth = 0;
  for (const h of nonCyclic) {
    if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largestTreeRoot)) {
      maxDepth = h.depth;
      largestTreeRoot = h.root;
    }
  }

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: { total_trees: nonCyclic.length, total_cycles: cyclic.length, largest_tree_root: largestTreeRoot }
  };
}

function detectCycle(component, adjacency) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const node of component) color[node] = WHITE;

  function dfs(node) {
    color[node] = GRAY;
    for (const child of (adjacency[node] || [])) {
      if (color[child] === GRAY) return true;
      if (color[child] === WHITE && dfs(child)) return true;
    }
    color[node] = BLACK;
    return false;
  }

  for (const node of component) {
    if (color[node] === WHITE && dfs(node)) return true;
  }
  return false;
}

function buildTree(root, adjacency) {
  const tree = {};
  const children = (adjacency[root] || []).sort();
  const subtree = {};
  for (const child of children) {
    Object.assign(subtree, buildTree(child, adjacency));
  }
  tree[root] = subtree;
  return tree;
}

function calcDepth(tree) {
  const keys = Object.keys(tree);
  if (keys.length === 0) return 0;
  const root = keys[0];
  const children = tree[root];
  const childKeys = Object.keys(children);
  if (childKeys.length === 0) return 1;

  let maxChildDepth = 0;
  for (const childKey of childKeys) {
    const childTree = {};
    childTree[childKey] = children[childKey];
    maxChildDepth = Math.max(maxChildDepth, calcDepth(childTree));
  }
  return 1 + maxChildDepth;
}

module.exports = { processData };
