## ADDED Requirements

### Requirement: Conservative source-backed geography

Job collections SHALL offer Country and Region as regular property conditions over all retained source locations. Exact countries SHALL match recognized structured source country values or unambiguous explicit country labels. City-only labels, ambiguous abbreviations and excluded countries SHALL NOT be inferred as eligible countries. Countries SHALL contribute their documented broad geographical region; EU and Europe labels SHALL contribute Europe without implying any exact country. Explicit compound regions and Worldwide SHALL retain their own scope. Missing recognized values SHALL be filterable as Unknown. Original location text, addresses and employer eligibility restrictions SHALL remain unchanged and accessible in posting details.

#### Scenario: Exact country versus broad eligibility

- **WHEN** the index contains Spain, Germany, Europe-only, EU-only, city-only and Europe-excluding-Spain postings
- **THEN** a Spain condition matches only postings explicitly located in Spain
- **AND** Europe can match explicit European countries and Europe/EU labels without expanding an exact-country condition
- **AND** a city-only or regional-only posting remains Unknown for Country

#### Scenario: Multiple retained locations

- **WHEN** a posting has several source locations or a recognized structured country
- **THEN** its matching country and region memberships are deduplicated
- **AND** recognized structured countries take precedence over contradictory location text
- **AND** inspecting or filtering the posting does not rewrite source data or read state

### Requirement: Source-backed department narrowing

Job collections SHALL offer Department as a regular property condition with consistent broad groups including Engineering and Marketing. Grouping SHALL use explicit retained department labels and fall back to team only when department is missing. Combined explicit labels MAY match multiple groups. Missing source labels SHALL remain Unknown and unrecognized supplied labels SHALL remain Other. Titles and descriptions SHALL NOT silently establish a department. Retained source department/team labels SHALL remain accessible in details.

#### Scenario: Narrow engineering and marketing work

- **WHEN** providers supply Engineering, Software Engineering, Eng, Marketing and Product Marketing labels
- **THEN** the Engineering and Marketing choices consistently narrow their respective explicit groups across providers
- **AND** a marketing-title posting without department/team information remains Unknown

#### Scenario: Unknown and unfamiliar departments

- **WHEN** a posting lacks department but supplies a recognizable team, or supplies no labels, or supplies an unfamiliar department
- **THEN** it uses the explicit team group, Unknown or Other respectively
- **AND** grouping does not alter any original source label

### Requirement: Consistent discovery condition execution

Country, Region and Department conditions SHALL share the existing search, equal/not-equal, empty/nonempty, AND/OR, pausing, removal and URL restoration behavior. Their values SHALL be validated before storage opens. Conditions SHALL execute before counts and bounded pagination in Inbox, Jobs and board-scoped collections, including retained history. Unknown SHALL correspond to no recognized values. Filtering SHALL require no provider refresh, AI call, database migration or client-side loading of the full index. Changes SHALL retain the existing page/selection/reader reset and background-content policies.

#### Scenario: Combine geography and department

- **WHEN** a user combines Europe, Engineering and Remote and revisits that URL
- **THEN** the same source-backed conditions apply to the full local collection before totals and pagination
- **AND** page results, empty states and library/inbox/board scope remain accurate
- **AND** pausing or removing a condition changes only that condition's effect

#### Scenario: Filter retained historical records

- **WHEN** an unavailable posting or archived board has retained locations and department data
- **THEN** the same discovery conditions work offline without reindexing
- **AND** the posting's source, identity, availability and read state are preserved

#### Scenario: Invalid discovery value

- **WHEN** a request supplies an unsupported country, region or department identifier
- **THEN** validation rejects it before opening local storage
