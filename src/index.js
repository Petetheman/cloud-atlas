// Microroute is a async routing library for cloudflare workers
export class CloudAtlas {
	constructor() {
		this.routes = [];
        this.current = {group: null, route: null, chain: null};
	}

    set(group=null, route=null, chain=null) {
        this.current = {group, route, chain};
        return this;
    }

	group(path) {
		const group = { path, bmw: [], error: [], amw: []};
        return this.set(group, null, group.bmw);		
	}

	on(method, path) {
        this.current.group ||= this.group('');
		const rndx = this.routes.push({path: (this.current.group.path || '') + path, method, group: this.current.group, mw: [], error: []});
		return this.set(this.current.group, this.routes[rndx], this.routes[rndx].mw);
	}

    catchAny(error, method) {
        (this.current.route || this.current.group).error.push({ error, method}); 
        return this;
    }

	catch(error, status, message) {
        this.catchAny(error, async (ex, con) => {if (ex instanceof error) con.res = {...con.res, status: status, body: message, statusText: message};});
		return this;
	}

	beforeAll() {return this.set(this.current.group, null, this.current.group.bmw)}

	afterAll() {return this.set(this.current.group, null, this.current.group.bmw)}

	use(mw) {
		Array.isArray(mw) ? mw.forEach(m => this.use(m)) : this.current.chain.push(mw);
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
		return !!con.params; 
	}

	compose(middlewares) {
		return async (ctx) => {
			const dispatch = async (index) => {index < middlewares.length ? await middlewares[index](ctx, () => dispatch(index + 1)) : Promise.resolve()};
			await dispatch(0);
		};
	}

    config() {return {fetch: async (req, env, ctx) => {return this.handle(new Context(req, env, ctx))}};}
}

['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS', 'HEAD'].forEach(method => {CloudAtlas.prototype['on' + method] = function(path) {return this.on(method, path);};});
['use', 'then', 'where', 'when', 'do', 'and', 'or', 'include', 'require', 'ensure', 'attach'].forEach(alias => CloudAtlas.prototype[alias] = CloudAtlas.prototype.use);

export class Context {
	constructor(req, env, ctx) {
		this.req = req;
		this.env = env;
		this.ctx = ctx;
        this.params = {};
        this.res = {body: {}, status: 200, statusText: 'OK', headers: {"Content-Type": "application/json"}};
	}

	get path() { return new URL(this.req.url).pathname;}
	get method() { return this.req.method; }
	response() {return new Response(JSON.stringify(this.res.body), {status: this.res.status, headers: this.res.headers, statusText: this.res.statusText})}
}
