// Microroute is a async routing library for cloudflare workers
export class CloudAtlas {
	constructor() {
		this.routes = [];
		this._set();
	}

    _set(group=null, route=null, chain=null) {
        this.current_route = route;
        this.current_group = group;
        this.current_chain = chain;
        return this;
    }

	group(path) {
		const group = { path, bmw: [], error: [], amw: []};
		return this._set(group, null, group.bmw);
	}

	on(method, path) {
        const group = this.current_group || this.group('');
		const route = {path: (group.path || '') + path, method, group: group, mw: [], error: group.error || []};
		this.routes.push(route);
		return this._set(route.group, route, route.mw);
	}

    catchAny(error, method) {
        (this.current_route || this.current_group).error.push({ error, method});
        return this;
    }

	catch(error, status, message) {
        this.catchAny(error, async (ex, con) => {if (ex instanceof error) con.res = {...con.res, status: status, body: message, statusText: message};});
		return this;
	}

	beforeAll() {return this._set(this.current_group, null, this.current_group.bmw)}

	afterAll() {return this._set(this.current_group, null, this.current_group.bmw)}

	use(mw) {
		Array.isArray(mw) ? mw.forEach(m => this.use(m)) : this.current_chain.push(mw);
		return this;
	}

	async handle(con) {
		const route = this.routes.find(r => this.matches(r, con));
		if (!route) return new Response('Not found', { status: 404 });
		
		try {
			await this.compose([...route.group.bmw, ...route.mw])(con);
		} catch (err) {
			const handler = [...route.error, ...route.group.error].find(h => err instanceof h.error);
			if (!handler) {throw err} else {await handler.method(err, con);}
		} finally {
            await this.compose(route.group.amw)(con);			
		}
		return con.response();
	}

	matches(route, con) {
		const [reqParts, routeParts] = [con.path, route.path].map(p => p.split('/').filter(Boolean));
		if (con.method !== route.method || reqParts.length !== routeParts.length) return false;
		con.params = routeParts.reduce((acc, p, i) => {if (p.startsWith(':')) {acc[p.slice(1)] = reqParts[i]; return acc;} return p === reqParts[i] ? acc : null;}, {});
		return !!con.params; // Convert to boolean (null becomes false)
	}

	compose(middlewares) {
		return async (ctx) => {
			const dispatch = async (index) => {
				if (index >= middlewares.length) return;
				const middleware = middlewares[index];
				await middleware(ctx, () => dispatch(index + 1));
			};
			await dispatch(0);
		};
	}
}

['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS', 'HEAD'].forEach(method => {CloudAtlas.prototype['on' + method] = function(path) {return this.on(method, path);};});
['use', 'then', 'where', 'when', 'do', 'and', 'or', 'include', 'require', 'ensure', 'attach'].forEach(alias => CloudAtlas.prototype[alias] = CloudAtlas.prototype.use);

export class Context {
	constructor(req, env, ctx) {
		this.req = req;
		this.env = env;
		this.ctx = ctx;
        this.params = {};
        this.res = {body: {}, status: 200, statusText: 'OK', headers: {}};
	}

	get path() { return new URL(this.req.url).pathname;}
	get method() { return this.req.method; }

	response() {
		this.res.headers['Content-Type'] = typeof this.res._body === 'object' ? 'application/json' : 'text/plain';
		return new Response(typeof this.res._body === 'object' ? JSON.stringify(this.res._body) : this.res._body, {status: this.res.status, headers: this.res.headers, statusText: this.res.statusText});
	}
}