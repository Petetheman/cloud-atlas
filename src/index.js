// Microroute is a async routing library for cloudflare workers
export class CloudAtlas {
	constructor() {
		this.routes = [];
		this.current_group = null;
		this.current_route = null;
		this.current_chain = null;
	}

	group(path) {
		const group = { path, bmw: [], error: [], amw: []};
		this.current_route = null;
		this.current_group = group;
		this.current_chain = group.bmw;
		return this;
	}

	on(method, path) {
		const route = {path: (this.current_group?.path || '') + path, method, group: this.current_group, mw: [], error: this.current_group?.error || []};
		this.routes.push(route);
		this.current_route = route;
		this.current_chain = route.mw;
		return this;
	}

	onError(error, status, message) {
		if (this.current_route) this.current_route.error.push({ error, status, message });
		else if (this.current_group) this.current_group.error.push({ error, status, message });
		return this;
	}

	beforeAll() {this.current_route = null; this.current_chain = this.current_group.bmw; return this;}

	afterAll() {this.current_route = null; this.current_chain = this.current_group.amw; return this;}

	use(mw) {
		if (Array.isArray(mw)) {
			mw.forEach(m => this.use(m));
		}
		this.current_chain.push(mw);

		return this;
	}

	async handle(req, env, ctx) {
		const con = new Context(req, env, ctx);
		const route = this.routes.find(r => this.matches(r, con));

		if (!route) return new Response('Not found', { status: 404 });
		
		try {
			const middlewares = [...route.group.bmw, ...route.mw];
			const executor = this.compose(middlewares);
			await executor(con);
		} catch (err) {
			const handler = [...route.error, ...route.group.error].find(h => err instanceof h.error);
			if (!handler) throw err;
			con.status = handler.status;
			con.body = handler.message+' - '+err.message;
			con.statusText = handler.message;
		} finally {
			for (let mw of route.group.amw) await mw(con, () => Promise.resolve());
		}
		return con.response();
	}

	matches(route, con) {
		const reqParts = con.path.split('/').filter(Boolean);
		const routeParts = route.path.split('/').filter(Boolean);		
		return 	con.method === route.method && reqParts.length === routeParts.length && routeParts.every((p, i) => p.startsWith(':') || p === reqParts[i]);
	}

	compose(middlewares) {
		return ctx => middlewares.reduceRight((next, mw) => async () => mw(ctx, next), () => Promise.resolve())();
	}
}

['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS', 'HEAD'].forEach(method => {CloudAtlas.prototype['on' + method] = function(path) {return this.on(method, path);};});
['use', 'then', 'where', 'when', 'do', 'and', 'or', 'include', 'require', 'ensure', 'attach'].forEach(alias => CloudAtlas.prototype[alias] = CloudAtlas.prototype.use);

export class Context {
	constructor(req, env, ctx) {
		this.req = req;
		this.env = env;
		this.ctx = ctx;
		this.headers = {};
		this._body = {};
		this.status = 200;
		this.statusText = 'OK';
	}

	get path() { return new URL(this.req.url).pathname;}
	get method() { return this.req.method; }
	get body() { return this._body; }
	set body(v) {this._body = v;}

	response() {
		this.headers['Content-Type'] = typeof this._body === 'object' ? 'application/json' : 'text/plain';
		let body = typeof this._body === 'object' ? JSON.stringify(this._body) : this._body;
		return new Response(body, {status: this.status,headers: this.headers, statusText: this.statusText});
	}
}