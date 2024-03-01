## Landscape2 Academic 

This is fork of [CNCF Landscape2](http://github.com/cncf/landscape2) that provides extra features:

- Laboratories
    - [ ] hindex of head
    - [ ] citations metric
    - [ ] number of papers metric
    - [ ] head description
- Main
    - [x] manual location
    - [x] filter by location
    - [ ] filter by tags
    - [ ] search by tags
    - [ ] image in summary
    - [ ] feature manually
    - [ ] BibTeX citation in footer
    - [ ] git organization url instead of repository url
    - [ ] search by everything
- Books
    - [ ] dedicated Amazon URL icon

Other differences
- no homebrew
- no docker

## Notes

- `2023-03-01`, decoupling location from organization since some items do not have organization
- `2024-02-29`, not using SerpAPI for h-index, since it is expensive
- `2024-02-29`, not using Crunchbase for company info, since it requires expensive Enterprise level subscription
