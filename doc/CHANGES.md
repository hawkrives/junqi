# Change History

## 0.0.2 - Modularization
* Added the AS operator to the objeq grammar.  This operator allows you to define semi-persistent symbols that will be associated with the currently evaluated Item in subsequent Query Steps.  These symbols *will not* survive Aggregators, but will survive every other type of processing.  Example:

    this as %parent <: children -> {
      first_name,
      last_name,
      child_of: %parent
    }

* Made some backward-compatible changes to the objeq grammar that will allow for arbitrary ordering of Query Steps.  So now Predicates, Collators, Selectors, and Aggregators can appear anywhere in a query.  Trailing Predicates will require 'then' or 'where' to delimit them from leading Collators, Selectors or Aggregators.

* The architecture has been further modularized to support the type of work we'll be doing, specifically trying to make it easier to introduce a grammar without it infecting the entire code-base.

## 0.0.1 - Initial Release
* Objeq grammar is implemented, JSONiq grammar is not
