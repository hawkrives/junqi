# Change History

## 0.0.10 - Query Compilation Convenience
* Having to compile a query like this:

    var query = objeq(
      "WHERE lastName == %1 " +
      "  AND firstName == %2 " +
      "SELECT { " +
      "  fullName: firstName + ' ' + lastName " +
      "}"
    );

Is a pain in the ass and makes it hard to maintain.  So we'll just allow this as well:

    var query = objeq(function() {/*
      WHERE lastName == %1 
        AND firstName == %2
      SELECT {
        fullName: firstName + ' ' + lastName
      }      
    */});

This way, you can remember what it was like to embed JavaScript into a web page back in the late 1990's.  The query is extracted from the function body's comment, everything else will be ignored for now.

## 0.0.9 - Fixed Array Paths
* Drilling into an Array was broken.  For whatever brain-dead reason, I was pulling the first element and then drilling into that.   I'm not doing that anymore.

## 0.0.8 - Extend
* Altered the SELECT step to allow more convenient array literal generation.  If you specify a comma-separated list, the result will be identical to having selected an array literal.  For example, the following are identical selectors:

    -> firstName, lastName
    
    -> [ firstName, lastName ]

But this query will continue to behave as it had before:

    -> firstName + ' ' + lastName

* Added the EXTEND (|>) operator to the objeq grammar.  It will behave almost identically to the extend function provided by many utility libraries (ex: underscore).  The only difference is that it will not mutate the original objects.  For example:

    this as %parent expand children extend this, { child_of: %parent }

or

    this as %parent <: children |> this, { child_of: %parent }

This query will return a flattened list of all children, but with an additional property called child_of that points to their parent.  As you can produce extensions of arbitrary objects, the first item in the list must be 'this' if you want to extend the currently evaluated object.

## 0.0.7 - Compiler Refactoring
* In preparation for JSONiq support, refactored the compiler to allow recursive steps and evaluators at the root of the parse tree.

## 0.0.6 - Documentation Cleanup
* Cleaned up the documentation a bit to match reality.
* Made the extensions sub-module available as the documentation suggests.
* Allowed both hashes and arrays of functions to be specified in calls to registerExtensions()

## 0.0.5 - Removed 'CONTRACT'
* Removed the CONTRACT (:>) operator.  Its behavior was confusing and could easily be reproduced using the EXPAND (<:) operator against the first element of an Array.

## 0.0.4 - Fixed Sorting
* Bug Fix Release.  Changes to 0.0.2 to support 'AS' broke sorting.  This has been corrected and some initial tests have been added to avoid regressions.

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
