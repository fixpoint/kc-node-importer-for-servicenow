var KcNodeImporter = Class.create(),
    KcNodeRegistrar = Class.create(),
    KcApi = Class.create(),
    KcUtils = Class.create();

KcNodeImporter.prototype = {
    initialize: function(token, username, password) {
        this.kapi = new KcApi(token, username, password);
    },

    importManagedNodes: function(endpoint, sn_domain, limit) {
        gs.log('Get node list from Kompira cloud');
        var nodes = this.kapi.get(endpoint, {'limit': limit || 500});

        nodes.items.forEach( function(node) {
            gs.log('Get package list for node ' + node.displayName);
            var packages = this.kapi.get(KcUtils.urljoin(endpoint, node.managedNodeId, 'packages'), {'limit': 1000});

            gs.log('Get note list for node ' + node.displayName);
            var notes = this.kapi.get(KcUtils.urljoin(endpoint, node.managedNodeId, 'notes'), {'limit': 50});

            gs.log('Import kompira cloud node: ' + node.displayName);
            var kc_rgstr = new KcNodeRegistrar(node, packages, notes, sn_domain);
            kc_rgstr.upsertAll();
        }, this);
    },

    importManagedNode: function(endpoint, sn_domain) {
        gs.log('Get node infomation from Kompira cloud');
        var node = this.kapi.get(endpoint);

        gs.log('Get package list for node ' + node.displayName);
        var packages = this.kapi.get(KcUtils.urljoin(endpoint, 'packages'), {'limit': 1000});

        gs.log('Get note list for node ' + node.displayName);
        var notes = this.kapi.get(KcUtils.urljoin(endpoint, 'notes'), {'limit': 50});

        gs.log('Import kompira cloud node: ' + node.displayName);
        var kc_rgstr = new KcNodeRegistrar(node, packages, notes, sn_domain);
        kc_rgstr.upsertAll();
    },

    type: 'KcNodeImporter'
};


KcNodeRegistrar.prototype = {
    RX_CPU_MANUFACTURERS: {
        'Intel': /intel|pentium|celeron|xeon|core|atom|itanium/i,
        'AMD': /amd|athlon|duron|sempron|opteron|turion|phenom|ryzen|epyc/i,
        'IBM': /ibm|power/i,
        'NVIDIA': /nvidia|tegra/i,
        'VIA Technologies': /via|cyrix/i,
        'Sun Microsystems': /ultrasparc/i,
        'Fujitsu': /sparc64/i,
    },

    initialize: function(node, packages, notes, sn_domain) {
        this.node = node;
        this.packages = packages;
        this.notes = notes;
        this.sn_domain_id = this.getDomainId(sn_domain);
    },

    upsertAll: function() {
        var gr_node = this.upsertNode();
        this.upsertNics(gr_node.sys_id);
        this.upsertPackages(gr_node.sys_id);
        this.upsertSerials(gr_node.sys_id);
    },

    upsertNode: function() {
        var table,
            model_id = this.dig('extraFields.product.modelName'),
            vendor_name = this.dig('extraFields.product.vendorName'),
            cpu_name = this.dig('extraFields.cpu.cpu0.modelName'),
            cpu_vendor_name = '';

        switch(true) {
        case this.dig('extraFields.kernel.name') == 'Linux':
            table = 'cmdb_ci_linux_server';
            break;
        case /windows/i.test(this.dig('system.family')):
            table = 'cmdb_ci_win_server';
            break;
        default:
            table = 'cmdb_ci_netgear';
        }

        Object.keys(this.RX_CPU_MANUFACTURERS).forEach(function(k) {
            if (this.RX_CPU_MANUFACTURERS[k].test(cpu_name)) {
                cpu_vendor_name = k;
                return;
            }
        }, this);

        var gr_vendor = this.upsertCompany(vendor_name),
            gr_cpu_vendor = this.upsertCompany(cpu_vendor_name),
            gr_model;

        if (model_id) {
            gr_model = this.upsertGRecord('cmdb_hardware_product_model', {
                // cmdb_model_category: list[cmdb_model_category.sys_id],
                display_name: vendor_name ? vendor_name + ' ' + model_id : model_id,
                manufacturer: gr_vendor.sys_id,
            }, {name: model_id});
        } else {
            gr_model = {sys_id: null};
        }

        var gr_node = this.upsertGRecord(table, {
            name: this.dig('displayName'),
            host_name: this.dig('addresses.0.hostnames.0.hostname'), // temp
            discovery_source: 'Kompira cloud',
            manufacturer: gr_vendor.sys_id,
            model_id: gr_model.sys_id,
            ram: this.dig('extraFields.memory.totalSize') / 1024,
            cpu_name: cpu_name,
            cpu_type: cpu_name,
            cpu_manufacturer: gr_cpu_vendor.sys_id,
            cpu_speed: this.dig('extraFields.cpu.cpu0.clockSpeed'),
            cpu_count: this.dig('extraFields.cpu.numberOfProcessors'),
            cpu_core_count: this.dig('extraFields.cpu.numberOfCores'),
            model_number: this.dig('extraFields.product.modelNumber'),
            serial_number: this.dig('extraFields.product.serialNumber'),
            firmware_version: this.dig('extraFields.product.firmwareVersionNumber'),
            kernel_release: this.dig('extraFields.kernel.release'),
            disk_space: this.dig('extraFields.storage.totalSize') / 1024 / 1024,
            fqdn: this.dig('addresses.0.hostnames.0.hostname'), // temp
            dns_domain: this.dig('addresses.0.hostnames.0.hostname'),
            // os_domain: dig(''),
            os: this.dig('system.family'),
            os_version: this.dig('system.version'),
            short_description: [
                [
                    this.dig('extraFields.kernel.name'),
                    this.dig('addresses.0.hostnames.0.hostname'),
                    this.dig('extraFields.kernel.release'),
                    this.dig('extraFields.kernel.version'),
                ].join(" "),
                [
                    this.dig('extraFields.motherboard.vendorName'),
                    this.dig('extraFields.motherboard.modelNumber'),
                    this.dig('extraFields.motherboard.versionNumber'),
                ].join(" "),
                [
                    this.dig('extraFields.bios.vendorName'),
                    this.dig('extraFields.bios.versionNumber'),
                    cpu_name,
                ].join(" "),
            ].join("\n"),
            comments: this.notes.items.map(function(v) {return v.title + ': ' + v.body;}).join("\n"),
            default_gateway: this.dig('extraFields.networking.defaultGateways.0.addr'),
            ip_address: this.dig('interfaces.0.addr'),
            mac_address: this.dig('interfaces.0.macaddr'),
            virtual: /vmware/i.test(vendor_name),
        }, {asset_tag: this.dig('managedNodeId')});
        return gr_node;
    },

    upsertNics: function(cmdb_ci_id) {
        var ifaces = {}, upsertGRecord = this.upsertGRecord;
        (this.dig('interfaces') || []).forEach( function(iface) {
            ifaces[iface.ifname] || (ifaces[iface.ifname] = {
                macaddr: null,
                addresses: [],
                default_gateways: [],
            });
            ifaces[iface.ifname].macaddr = iface.macaddr;
            ifaces[iface.ifname].addresses.push({ip: iface.addr, netmask: iface.netmask});
        });
        (this.dig('extraFields.networking.defaultGateways') || []).forEach( function(gw) {
            ifaces[gw['interface']] && (ifaces[gw['interface']].default_gateways.push(gw.addr));
        });
        Object.keys(ifaces).forEach(function (ifname) {
            var gr_nic = upsertGRecord('cmdb_ci_network_adapter', {
                operational_status: 1,
                install_status: 1,
                discovery_source: 'Kompira cloud',
                mac_address: ifaces[ifname].macaddr,
                ip_address: ifaces[ifname].addresses[0].ip,
                netmask: ifaces[ifname].addresses[0].netmask,
                ip_default_gateway: ifaces[ifname].default_gateways[0] || null,
                // gr_nic.dhcp_enabled = "0";
                // gr_nic.dns_domain = "";
            }, {
                name: ifname,
                cmdb_ci: cmdb_ci_id,
            });

            ifaces[ifname].addresses.forEach(function (addr) {
                var gr_ip = upsertGRecord('cmdb_ci_ip_address', {
                    operational_status: 1,
                    install_status: 1,
                    ip_version: 4,
                    name: addr.ip,
                    ip_address: addr.ip,
                    netmask: addr.netmask,
                    mac_address: ifaces[ifname].macaddr,
                    // gr_ip.can_print = "0";
                }, {
                    ip_address: addr.ip,
                    nic: gr_nic.sys_id,
                });
            });
        });
    },

    upsertPackages: function(cmdb_ci_id) {
        var upsertGRecord = this.upsertGRecord;
        (this.packages.items || []).forEach( function(pkg) {
            var package_name = pkg.name + ' ' + pkg.version;
            var gr_pkg = upsertGRecord('cmdb_ci_spkg', {
                install_status: 1,
                discovery_source: 'Kompira cloud',
                name: pkg.name,
                version: pkg.version,
                // gr_sw.manufacturer = core_company.sys_id
                // gr_sw.key = "abrt_:::_2.1.11-36.el7.centos" // ビジネスルール[Update key field]で自動更新される
            }, { package_name: package_name });

            var gr_pkg_ins = upsertGRecord('cmdb_software_instance', {
                software: gr_pkg.sys_id,
            }, {
                name: pkg.name,
                installed_on: cmdb_ci_id,
            });
        });
    },

    upsertSerials: function(cmdb_ci_id) {
        var upsertGRecord = this.upsertGRecord;
        [
            {number: this.dig('system.serial'), type: 'system'},
            {number: this.dig('extraFields.product.serialNumber'), type: 'system'},
            {number: this.dig('extraFields.motherboard.serialNumber'), type: 'motherboard'},
        ].forEach( function(serial) {
            if (serial.number) {
                var gr_serial = upsertGRecord('cmdb_serial_number', {
                    valid: true,
                }, {
                    serial_number: serial.number,
                    serial_number_type: serial.type,
                    cmdb_ci: cmdb_ci_id,
                });
            }
        });
    },

    upsertCompany: function(name) {
        var gr_vendor = {sys_id: null};
        if (name) {
            gr_vendor = this.upsertGRecord('core_company', {
                notes: 'Registered from Kompira cloud',
            }, {name: name});
        }
        return gr_vendor;
    },

    upsertGRecord: function(table, update_params, where_params) {
        if (this.sn_domain_id) {
            update_params.sys_domain = this.sn_domain_id;
        }
        var gr = new GlideRecord(table);
        if (where_params) {
            Object.keys(where_params).forEach(function (k) {
                gr.addQuery(k, where_params[k]);
            });
            gr.query();
            if (gr.next()) {
                do {
                    Object.keys(update_params).forEach(function (k) {
                        gr[k] = update_params[k];
                    });
                    var last_gr = gr;
                    gr.update();
                } while(gr.next());
                return last_gr;
            }
            gr.initialize();
            Object.keys(where_params).forEach(function (k) {
                gr[k] = where_params[k];
            });
        } else {
            gr.initialize();
        }
        Object.keys(update_params).forEach(function (k) {
            gr[k] = update_params[k];
        });
        gr.insert();
        return gr;
    },

    getDomainId: function(name) {
        if (name) {
            var gr = new GlideRecord('domain');
            gr.addQuery('name', name);
            gr.query();
            if (gr.next()) {
                return gr.sys_id;
            }
        }
        return null;
    },

    dig: function(path, obj) {
        var val = obj || this.node;
        try {
            path.split('.').forEach( function(k) {
                val = val[k];
            });
            return typeof val === 'undefined' ? null : val;
        } catch (e) {
            if (e instanceof TypeError) {
                return null;
            } else {
                throw e;
            }
        }
    },

    type: 'KcNodeRegistrar'
};


KcApi.prototype = {
    initialize: function(token, username, password) {
        this.req = new sn_ws.RESTMessageV2();
        this.req.setHttpTimeout(30000);
        this.req.setRequestHeader('Content-Type', 'application/json');
        this.req.setRequestHeader('Accept', 'application/json');
        this.req.setRequestHeader('X-Authorization', 'Token ' + token);
        if (username) {
            this.req.setBasicAuth(username, password);
        }
    },

    get: function(endpoint, params) {
        try {
            this.req.setHttpMethod('get');
            this.req.setEndpoint(this.convertApiUrl(endpoint));
            Object.keys(params || {}).forEach(function (k) {
                this.req.setQueryParameter(k, params[k]);
            }, this);
            var res = this.req.execute();
            return res.getStatusCode() == 200 ? JSON.parse(res.getBody()) : null;
        } catch(ex) {
            gs.error(ex.message);
        }
    },

    convertApiUrl: function(url) {
        m = url.match(/^(https?:\/\/[^\/]+)\/(?!api)(.*)$/);
        return m ? m[1] + '/api/' + m[2] : url;
    },

    type: 'KcApi'
};


KcUtils.urljoin = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    return args
        .join('/')
        .replace(/[\/]+/g, '/')
        .replace(/^(.+):\//, '$1://')
        .replace(/^file:/, 'file:/')
        .replace(/\/(\?|&|#[^!])/g, '$1')
        .replace(/\?/g, '&')
        .replace('&', '?');
};
