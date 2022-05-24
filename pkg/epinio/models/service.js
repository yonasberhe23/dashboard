import EpinioNamespacedResource from './epinio-namespaced-resource';

export default class EpinioServiceInstanceModel extends EpinioNamespacedResource {
  get links() {
    return {
      update:      this.getUrl(),
      self:        this.getUrl(),
      remove:      this.getUrl(),
      bind:        `${ this.getUrl() }/bind`,
      unbind:      `${ this.getUrl() }/unbind`,
      create:      this.getUrl(this.metadata?.namespace, null), // ensure name is null
    };
  }

  getUrl(namespace = this.metadata?.namespace, name = this.metadata?.name) {
    // getUrl(namespace = this.meta?.namespace, name = this.meta?.name) {
    // Add baseUrl in a generic way
    return this.$getters['urlFor'](this.type, this.id, { url: `/api/v1/namespaces/${ namespace }/services/${ name || '' }` });
  }

  // ------------------------------------------------------------------

  get state() {
    return this.status;
  }

  async create() {
    await this.followLink('create', {
      method:  'post',
      headers: {
        'content-type': 'application/json',
        accept:         'application/json'
      },
      data: {
        name:            this.name,
        catalog_service: this.catalog_service
      }
    });
  }

  async bindApp(appName) {
    await this.followLink('bind', {
      method:  'post',
      headers: {
        'content-type': 'application/json',
        accept:         'application/json'
      },
      data: { app_name: appName }
    });
  }

  async unbindApp(appName) {
    await this.followLink('unbind', {
      method:  'post',
      headers: {
        'content-type': 'application/json',
        accept:         'application/json'
      },
      data: { app_name: appName }
    });
  }

  async delete(unbind = true) {
    await this._remove({ data: { unbind } });
  }

  async remove() {
    await this.delete(true);// TODO: RC wire in somehow
  }
}