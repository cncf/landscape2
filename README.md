## Landscape2 Academic 

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fopen-neuroscience-foundation%2Flandscape2-academic&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)

This is fork of [CNCF Landscape2](http://github.com/cncf/landscape2) that provides extra features:

- Academic
    - [x] scholars details section
    - [x] num citations metric
    - [x] h-index metric
    - [x] i10-index metric
    - [ ] number of papers metric
- Main
    - [x] manual location
    - [x] filter by location
    - [x] citation in footer
    - [ ] filter by tags
    - [ ] search by tags
    - [ ] feature manually
    - [ ] git organization url instead of repository url
    - [ ] search by everything
- Books
    - [ ] Amazon URL icon

Other differences
- no homebrew
- no docker
- updated footer "Powered by" link
- `CRUNCHBASE_CACHE_TTL` env var, and setting it to 0 causes not refreshing crunchbase

## Notes

- `2024-03-01`, decoupling location from organization since some items do not have organization
- `2024-02-29`, not using SerpAPI for h-index, since it is expensive
- `2024-02-29`, not using Crunchbase API for company info, since it requires expensive Enterprise level subscription
