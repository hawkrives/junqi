# Change History

## 0.0.3 - Group By
* Added initial support for GROUP BY steps in the objeq grammar.  Results can now be grouped both by primitive values and objects (or arrays), but if a primitive value is not used, junqi will have to decorate that object or array with a grouping identifier.

    group by lastName, firstName aggregate count

or

    group lastName, firstName := count

This query will first group a set by lastName, and then sub-group by firstName.  The `count` aggregate will be applied to the most granular group, which in this case is firstName within lastName.  So if there are any people with exactly the same name, the result will be greater than 1.  You could simplify this query down to a single group depth by using an expression:

    group lastName + ':' firstName := count

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
