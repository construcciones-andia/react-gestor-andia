import axios from 'axios';
import {
  chain,
  each,
  isUndefined,
  isNull,
  isObject,
} from 'lodash';
import config from './config';
import fileDownload from 'js-file-download';
import moment from 'moment';

function catchReturn({ key }) {
  if (key === 'Enter') {
    this.fetch();
  }
}

function clearFilterVisitas() {
  this.setState(current => ({
    ...current,
    promocion_id: '',
    offset: 0,
    query: '',
    status: '',
    filterVisitas: {
      ...current.filterVisitas,
      since: moment('2019-01-01'),
      until: moment(),
    },
  }), this.fetch);
}

function handleFilterPromociones() {
    this.setState(current => ({
      ...current,
      filterPromociones: {
        ...current.filterPromociones,
        active: !current.filterPromociones.active,
      },
    }), this.fetch);
  }

function fetch(cb = () => (null)) {
  let url = `${this.props.url}?offset=${this.state.offset}&limit=${this.props.limit}`;
  if (this.state.query !== '') {
    url += `&query=${this.state.query}`;
  }
  if (this.props.visitas && this.state.promocion_id !== '') {
    url += `&promocion=${this.state.promocion_id}`;
  }
  if (this.props.visitas && this.state.user_id !== '') {
    url += `&user_id=${this.state.user_id}`;
  }
  if (this.props.visitas && this.state.status !== '') {
    url += `&status=${this.state.status}`;
  }
  if (this.props.visitas && !isNull(this.state.filterVisitas.since) && isObject(this.state.filterVisitas.since)) {
    url += `&since=${this.state.filterVisitas.since.format('YYYY-MM-DD')}`;
  }
  if (this.props.visitas && !isNull(this.state.filterVisitas.until) && isObject(this.state.filterVisitas.until) ) {
    url += `&until=${this.state.filterVisitas.until.format('YYYY-MM-DD')}`;
  }
  if (this.props.isPromociones) {
    url += `&active=${this.state.filterPromociones.active ? 1 : 0}`;
  }
  if (config.DEBUG) console.log(url);
  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${this.props.session.authToken}`,
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      if (response.status !== 200 && response.status !== 204) {
        return cb(new Error(`Status erros in fetchStats expected 200 or 204 received ${response.status}`));
      }
      this.setState(current => ({
        ...current,
        loading: false,
        results: chain(response.data.data.results)
          .map(row => ({
            ...row,
            selected: false,
          }))
          .keyBy('id')
          .value(),
        pagination: response.data.data.pagination,
      }), () => {
        return cb(null, response.data);
      });
    })
    .catch((error) => {
      return cb(error);
    });
}

function handleOffset(offset) {
  this.setState(current => ({
    ...current,
    loading: true,
    results: {},
    offset,
  }), this.fetch);
}

function handleSelect(which) {
  this.setState(current => ({
    ...current,
    results: {
      ...current.results,
      [which.id]: {
        ...current.results[which.id],
        selected: !current.results[which.id].selected,
      }
    },
  }));
}

function handleBoolean(which, key, cb = () => null) {
  const url = this.props.url;
  if (config.DEBUG) console.log(url);
  return axios.put(url, { id: which.id, [key]: !which[key] ? 1 : 0 }, {
    headers: {
      Authorization: `Bearer ${this.props.session.authToken}`,
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      console.log({ response });
      if (response.status !== 200 && response.status !== 204) {
        return cb(new Error(`Status erros in fetchStats expected 200 or 204 received ${response.status}`));
      }
      this.setState(current => ({
        ...current,
        results: {
          ...current.results,
          [which.id]: {
            ...current.results[which.id],
            [key]: !current.results[which.id][key],
          },
        },
      }), () => {
        return cb(null, response.data);
      });
    })
    .catch((error) => {
      return cb(error);
    });
}

function handleActive(which, cb = () => null) {
  return this.handleBoolean(which, 'active', cb);
}

function handleHome(which, cb = () => null) {
  return this.handleBoolean(which, 'home', cb);
}

function hideModal() {
  this.setState(current => ({
    ...current,
    modal: {
      ...current.modal,
      display: false,
      candidate: null,
    }
  }));
}

function showModal(candidate) {
  this.setState(current => ({
    ...current,
    modal: {
      ...current.modal,
      display: true,
      candidate,
    }
  }));
}

function hideFilterVisitas() {
  this.setState(current => ({
    ...current,
    filterVisitas: {
      ...current.filterVisitas,
      display: false,
    }
  }));
}

function showFilterVisitas() {
  this.setState(current => ({
    ...current,
    filterVisitas: {
      ...current.filterVisitas,
      display: true,
    }
  }));
}

function handleDelete(){
  if (isNull(this.state.modal.candidate) || !this.state.modal.candidate.id) {
    return;
  }
  const url = `${this.props.url}/${this.state.modal.candidate.id}`;
  if (config.DEBUG) console.log(url);
  return axios.delete(url, {
    headers: {
      Authorization: `Bearer ${this.props.session.authToken}`,
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      this.fetch(this.hideModal);
    })
    .catch((error) => {
      console.error(error);
    });
}

function handleSuperuser(which, cb = () => null) {
  return this.handleBoolean(which, 'superuser', cb);
}

function handleQuery(e){
  const query = e.target.value;
  this.setState(current => ({
    ...current,
    query,
  }));
}

function handleDates({ startDate, endDate }) {
  this.setState(current => ({
    ...current,
    filterVisitas: {
      ...current.filterVisitas,
      since: startDate,
      until: endDate,
      },
    }), this.fetch);
}

function onMount() {
  this.fetch();
  if (this.props.visitas) {
    this.fetchPromociones();
    this.fetchUsers();
  }
}

function requestExcel(url) {
  const params = [];
  if (this.state.query !== '') {
    params.push(`query=${this.state.query}`);
  }
  if (this.props.visitas && this.state.promocion_id !== '') {
    params.push(`promocion=${this.state.promocion_id}`);
  }
  if (this.props.visitas && this.state.status !== '') {
    params.push(`status=${this.state.status}`);
  }
  url = params.length ? `${url}?${params.join('&')}` : url;
  if (config.DEBUG) console.log(url);
  return axios.get(url, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${this.props.session.authToken}`,
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      fileDownload(response.data, 'visitas.xlsx');
    })
    .catch(console.log);
}

function urlFor(path, params) {
  let to = path;
  const i = to.indexOf(':');
  if (i === -1) {
    return to;
  }

  to = path.substr(0, i - 1);
  each(path.substr(i + 1).split('/:'), (candidate) => {
    const param = candidate.substr(-1) === '?' ?
      { optional: true, value: candidate.substr(0, candidate.length - 1) } :
      { optional: false, value: candidate };
    if (!isUndefined(params[param.value]) && !isNull(params[param.value])) {
      to += `/${params[param.value]}`;
    } else if (!param.optional && config.DEBUG) {
      console.error(`${candidate} is required for ${path}, params: ${JSON.stringify(params)}`);
    }
  });
  return to;
}

export default {
  catchReturn,
  clearFilterVisitas,
  fetch,
  handleActive,
  handleFilterPromociones,
  handleDates,
  handleBoolean,
  handleDelete,
  handleHome,
  handleOffset,
  handleQuery,
  handleSelect,
  handleSuperuser,
  hideFilterVisitas,
  hideModal,
  onMount,
  requestExcel,
  showFilterVisitas,
  showModal,
  urlFor,
};
