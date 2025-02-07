export class CloudAtlas {
    constructor() {Object.assign(this, {routes: [], current: { group: null, route: null, chain: null }});}

    //Builders
    set(group = null, route = null, chain = null) {this.current = { group, route, chain };return this;}
    group(path) {const group = { path, bmw: [], error: [], amw: [] };return this.set(group, null, group.bmw);}
    catchAny(error, method) {(this.current.route || this.current.group).error.push({ error, method });return this;}
    use(mw) {Array.isArray(mw) ? mw.forEach(m => this.use(m)) : this.current.chain.push(mw);return this;}
    catch(error, status, message) {return this.catchAny(error, async (ex, con) => {con.res = { ...con.res, status: status, body: message, statusText: message }; });}
    beforeAll() { return this.set(this.current.group, null, this.current.group.bmw) }
    afterAll() { return this.set(this.current.group, null, this.current.group.amw) }

    on(method, path) {  
        let group = (this.current.group||this.group(''));
        const rndx = this.routes.push({path: group.path + path, method, group: group, mw: [], error: [], pattern: new RegExp(`^${(group.path+path).replace(/:(\w+)/g, (_, paramName) => `(?<${paramName}>[^/]+)`)}$`)})-1;
        return this.set(this.current.group, this.routes[rndx], this.routes[rndx].mw);
    }

    //Config
    config() { return { fetch: async (req, env, ctx) => { return this.handle(new Context(req, env, ctx, this)) } }; }

    //Executors
    compose(middlewares) {return async (ctx) => {const dispatch = async (index) => { index < middlewares.length ? await middlewares[index](ctx, () => dispatch(index + 1)) : Promise.resolve() }; await dispatch(0)} }
    async handle(con, endpoint=null) {return await this.execute(this.routes.find(r => con.req.method === r.method && (con.params = r.pattern.exec((endpoint || new URL(con.req.url).pathname)))), con)}

    async execute(route, con) {
        if (!route) return new Response('Not found', { status: 404 });
        try {await this.compose([...route.group.bmw, ...route.mw])(con);} 
        catch (err) {const handler = [...route.error, ...route.group.error].find(h => err instanceof h.error); handler ? await handler.method(err, con) : (() => { throw err; })()}
        finally {await this.compose(route.group.amw)(con)}
        return con.response();        
    }
}

export class Context {
    constructor(req, env, ctx, app) {
        Object.assign(this, {req, env, ctx, app, params: {}});
        this.res = { body: {}, status: 200, statusText: 'OK', headers: { "Content-Type": "application/json" } };
    }
    response() { return new Response(JSON.stringify(this.res.body), { status: this.res.status, headers: this.res.headers, statusText: this.res.statusText }) }
}

['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS', 'HEAD'].forEach(method => { CloudAtlas.prototype['on' + method] = function (path) { return this.on(method, path); }; });
['use', 'then', 'where', 'when', 'do', 'and', 'or', 'include', 'require', 'ensure', 'attach', 'first', 'lastly'].forEach(alias => CloudAtlas.prototype[alias] = CloudAtlas.prototype.use);