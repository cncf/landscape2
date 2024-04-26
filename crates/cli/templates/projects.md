## Projects

| **project_name** | **maturity** | **accepted_date** | **sandbox_date** | **incubating_date** | **graduated_date** | **archived_date** | **num_security_audits** | **last_security_audit_date** |
| :--------------- | :----------: | :---------------: | :--------------: | :-----------------: | :----------------: | :---------------: | :---------------------: | :--------------------------: |
{%- for p in projects ~%}
    [{{ p.name }}]({{ p.homepage_url }}) | {{ p.maturity }} | {{ p.accepted_at }} | {{ p.sandbox_at }} | {{ p.incubating_at }} | {{ p.graduated_at }} | {{ p.archived_at }} | {{ p.num_security_audits }} | {{ p.last_security_audit }} {{ "|" -}}
{% endfor %}
