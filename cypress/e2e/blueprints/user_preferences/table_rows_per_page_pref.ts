export function tableRowsPerPagePayload(userId: string, clusterName: string, groupBy: string, namespace: string, rowsPerPage: string):object {
  return {
    id:   userId,
    type: 'userpreference',
    data: {
      cluster:         clusterName,
      'group-by':      groupBy,
      'ns-by-cluster': namespace,
      'seen-whatsnew': '"v2.9-dd23578d3e3499f54d80c4ed88cc52c44ee69539-head"',
      'per-page':      rowsPerPage
    }
  };
}
