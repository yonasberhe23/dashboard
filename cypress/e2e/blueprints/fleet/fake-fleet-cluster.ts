interface FleetCluster {
  id: string;
  type: string;
  links: {
    patch: string;
    remove: string;
    self: string;
    update: string;
    view: string;
  };
  apiVersion: string;
  kind: string;
  metadata: {
    annotations: Record<string, string>;
    creationTimestamp: string;
    fields: string[];
    generation: number;
    labels: Record<string, string>;
    name: string;
    namespace: string;
    relationships: Array<{
      fromId?: string;
      fromType?: string;
      toId?: string;
      toType?: string;
      rel: string;
      state: string;
      message: string;
      transitioning: boolean;
    }>;
    resourceVersion: string;
    state: {
      error: boolean;
      message: string;
      name: string;
      transitioning: boolean;
    };
    uid: string;
  };
  spec: Record<string, any>;
  status: Record<string, any>;
}

function generateFakeFleetCluster(clusterName: string): FleetCluster {
  return {
    id:    `fleet-default/${ clusterName }`,
    type:  'fleet.cattle.io.cluster',
    links: {
      patch:  `${ Cypress.env('api') }/v1/fleet.cattle.io.clusters/fleet-default/${ clusterName }`,
      remove: `${ Cypress.env('api') }/v1/fleet.cattle.io.clusters/fleet-default/${ clusterName }`,
      self:   `${ Cypress.env('api') }/v1/fleet.cattle.io.clusters/fleet-default/${ clusterName }`,
      update: `${ Cypress.env('api') }/v1/fleet.cattle.io.clusters/fleet-default/${ clusterName }`,
      view:   `${ Cypress.env('api') }/apis/fleet.cattle.io/v1alpha1/namespaces/fleet-default/clusters/${ clusterName }`
    },
    apiVersion: 'fleet.cattle.io/v1alpha1',
    kind:       'Cluster',
    metadata:   {
      annotations: {
        'objectset.rio.cattle.io/applied':         'H4sIAAAAAAAA/5RSW2/bPAz9Kx/4bPfL/WJgD0VXDMWAPbR7K/rASLSjRaYMiUqaBf7vg5xLDXQL2jeR4jk8POQBahLUKAjFAZDZCYpxHFLoVr9ISSC58cbdKBSxdGPc/0ZDAaUlklzZGIQ8ZP8sdjsmn1fbDRTQeLc1wTg2XPVKtsPsv++G9Ze7D7Ix1gQF0IhyoSD5cD6ZLyeD0WQxmcxyv6HRR3UlptCgostEmkqMVqDNQHnqzPhpagqCdQMFR2szsLgi21lUI2NFNbH0qE/Nc21CY3H/KblXCU9EKq9z/fvV2zkvr0y4xrCGAvRyMJvqslwuhuUYV6OhWozn4xnp6XJR6rkaTJczHE+HkB33o8m/kUABSV9y4zNTXLU1NKS6a6uI5bYsDRvZpwQ7Tf248VSS96S/Rm+4elJr0tEarh4qdpf0/SupmNYExfMZQ5xap/WIWt+/Np5COF718wE2tD/L6rnVqUluNuRRnIcCHhgy2KKNlIAgPhK8tC9tBjsy1VqgGLYvbZvBJq7oznFpqidSnuRDNuUJpToUvKf4cdVBQYnh4mF6WAzyRMTnE+1vIEE0BeNJPxLq/Tcjj9S4AMUgg9ORQnFoM/Dvvj0FF72iOxdZupZ9pq6kNiEYro5vp01pSHcBO3mrcr5ZI59+/CUdecNux917h0Zum8Ye8WnOWNfo93/teqZo2/ZPAAAA//9hGZJHxQQAAA',
        'objectset.rio.cattle.io/id':              'fleet-cluster',
        'objectset.rio.cattle.io/owner-gvk':       'provisioning.cattle.io/v1, Kind=Cluster',
        'objectset.rio.cattle.io/owner-name':      clusterName,
        'objectset.rio.cattle.io/owner-namespace': 'fleet-default'
      },
      creationTimestamp: '2025-05-22T19:02:45Z',
      fields:            [
        clusterName,
        '3/4',
        '2025-05-22T20:04:04Z',
        'NotReady(1) [Bundle e2e-test-1747935873618-git-repo-qa-test-apps-ng-0167c: not installed: Unable to continue with install: Deployment "nginx-keep" in namespace "nginx-keep" exists and cannot be imported into the current release: invalid ownership metadata; annotation validation error: key "meta.helm.sh/release-name" must equal "e2e-test-1747935873618-git-repo-qa-test-apps-ng-0167c": current value is "test-qa-test-apps-nginx-app"]'
      ],
      generation: 2,
      labels:     {
        'management.cattle.io/cluster-display-name': clusterName,
        'management.cattle.io/cluster-name':         'c-m-dzxrl7n9',
        'objectset.rio.cattle.io/hash':              'd9065dff981f3ab21c83736ed598fd7c0596a351',
        'provider.cattle.io':                        'rke2',
        foo:                                         'bar' // testing https://github.com/rancher/dashboard/pull/13217
      },
      name:          clusterName,
      namespace:     'fleet-default',
      relationships: [
        {
          fromId:        `fleet-default/${ clusterName }`,
          fromType:      'provisioning.cattle.io.cluster',
          rel:           'applies',
          state:         'removing',
          message:       'Resource scheduled for deletion',
          transitioning: true
        },
        {
          toId:          'fleet-default/request-9wr6n',
          toType:        'fleet.cattle.io.clusterregistration',
          rel:           'owner',
          state:         'active',
          message:       'Resource is current',
          transitioning: false
        },
        {
          toId:          `fleet-default/import-token-${ clusterName }`,
          toType:        'fleet.cattle.io.clusterregistrationtoken',
          rel:           'owner',
          state:         'active',
          message:       'Resource is current',
          transitioning: false
        }
      ],
      resourceVersion: '100409',
      state:           {
        error:         false,
        message:       '',
        name:          'Active',
        transitioning: false
      },
      uid: 'bc635d3d-126b-4188-8ee4-6a608c3c7939'
    },
    spec: {
      agentAffinity: {
        nodeAffinity: {
          preferredDuringSchedulingIgnoredDuringExecution: [
            {
              preference: {
                matchExpressions: [
                  {
                    key:      'fleet.cattle.io/agent',
                    operator: 'In',
                    values:   [
                      'true'
                    ]
                  }
                ]
              },
              weight: 1
            }
          ]
        }
      },
      clientID:                  'c4nvngshbfnsrmrcxkj9rxhkqgq4tntcppdwl7rk7jgbgdm4snzv84',
      kubeConfigSecret:          `${ clusterName }-kubeconfig`,
      kubeConfigSecretNamespace: 'fleet-default'
    },
    status: {
      agent: {
        lastSeen:  '2025-05-22T20:04:04Z',
        namespace: 'cattle-fleet-system'
      },
      agentAffinityHash:       'f50425c0999a8e18c2d104cdb8cb063762763f232f538b5a7c8bdb61',
      agentDeployedGeneration: 0,
      agentMigrated:           true,
      agentNamespaceMigrated:  true,
      agentTLSMode:            'system-store',
      apiServerCAHash:         '106eab90d1bb9f41a6bc937ccb191f4ff67809fffb93ce4a6e81822d',
      apiServerURL:            'https://yb212.qa.rancher.space',
      cattleNamespaceMigrated: true,
      conditions:              [
        {
          error:          false,
          lastUpdateTime: '2025-05-22T19:02:45Z',
          status:         'True',
          transitioning:  false,
          type:           'Processed'
        },
        {
          error:          true,
          lastUpdateTime: '2025-05-22T20:11:31Z',
          message:        'NotReady(1) [Bundle e2e-test-1747935873618-git-repo-qa-test-apps-ng-0167c: not installed: Unable to continue with install: Deployment "nginx-keep" in namespace "nginx-keep" exists and cannot be imported into the current release: invalid ownership metadata; annotation validation error: key "meta.helm.sh/release-name" must equal "e2e-test-1747935873618-git-repo-qa-test-apps-ng-0167c": current value is "test-qa-test-apps-nginx-app"]',
          status:         'False',
          transitioning:  true,
          type:           'Ready'
        },
        {
          error:          false,
          lastUpdateTime: '2025-05-22T19:03:13Z',
          status:         'True',
          transitioning:  false,
          type:           'Imported'
        },
        {
          error:          false,
          lastUpdateTime: '2025-05-22T19:03:02Z',
          status:         'True',
          transitioning:  false,
          type:           'Reconciled'
        }
      ],
      desiredReadyGitRepos: 1,
      display:              {
        readyBundles: '4/4',
        state:        'Ready'
      },
      garbageCollectionInterval: '15m0s',
      namespace:                 `cluster-fleet-default-${ clusterName }-450d4b`,
      readyGitRepos:             1,
      resourceCounts:            {
        desiredReady: 15,
        missing:      0,
        modified:     0,
        notReady:     0,
        orphaned:     0,
        ready:        15,
        unknown:      0,
        waitApplied:  0
      },
      summary: {
        desiredReady: 4,
        ready:        4
      }
    }
  };
}

export function generateFakeFleetClusterAndIntercepts(clusterName = 'e2e-test-fleet-cluster'): void {
  cy.intercept('GET', `/v1/fleet.cattle.io.clusters?*`, (req) => {
    req.continue((res) => {
      const body = structuredClone(res.body);

      body.data.unshift(generateFakeFleetCluster(clusterName));
      res.send(body);
    });
  }).as('fleetClusters');
}
