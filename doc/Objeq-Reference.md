# objeq Grammar Reference Manual
This document serves as a quick introduction to the objeq Query Grammar.

## Query
A Query consists of a set of steps.  Each step of a Query will yield an intermediate Working Set that will be passed to the next Query Step.  In this way, you can expand or refine the results of your query as necessary.  For example:

    where lastName == 'Beck' expand addresses then where country == 'Germany'

Which could have also been written as:

    lastName == 'Beck' <: addresses | country == 'Germany'

This is a Query that consists of three Query Steps.

1) The first Step takes the Source Set and filters it into a Working Set containing only those Items whose lastName property matches the String 'Beck'.

2) The second Step takes the Working Set and produces a Working Set consisting of the elements stored by the addresses properties of each evaluated Item.

3) The third Step processes the Working Set and filters those Items by a country property, resulting in a Result Set whose country must match the String 'Germany'.

## Query Step
A Query Step consists of one of four refinements.  The first is a Predicate that is used to filter your Source Set, the second is a Selector for drilling into the filtered results, the third is a Collator for ordering the results, and the fourth is an Aggregator for processing the Working Set into a single result.  The basic grammar for a Query is as follows:

    Query
      : LeadingStep (TrailingStep)*
      ;

    LeadingStep
      : WHERE? Predicate
      | Selector
      | Grouper
      | Collator
      | Aggregator
      ;

    TrailingStep
      : (THEN | WHERE) Predicate
      | THEN? Selector
      | THEN? Grouper
      | THEN? Collator
      | THEN? Aggregator
      ;

The order of the Steps is important because it determines the composition of the Working Set as it's being passed between the Steps.

For example, the following are *entirely* different Queries:

    where firstName == 'William' order by lastName select spouse

    where firstName == 'William' select spouse order by lastName

For brevity and to visually isolate the filter conditions, these two Queries could have also been written:

    firstName == 'William' by lastName -> spouse

    firstName == 'William' -> spouse by lastName

The first Query selects all Objects that have a firstName Property equal to 'William', orders those by the lastName Property of the same Object, and then returns the spouse Property of that Object.

The second Query selects all Objects that have a firstName Property equal to 'William', returns the spouse Property for each of those Objects, sorting them by the spouse's lastName Property.

These two Queries would only work identically if spouses have the same last name, but we know that in the real world this isn't always the case.

### Predicate Step
The Predicate starts with the keyword `where`, but this is purely optional and is meant solely for readability and to avoid ambiguity.  The `where` keyword is followed by a set of richly expressed conditions used to determine which Items from the Source Set will be returned as part of the Result Set

For the most part, the syntax for these conditions is the same as JavaScript's, expression syntax, but with some differences both in grammar and behavior.

#### Keywords
The keywords `and`, `or` and `not` may be used instead of `&&`, `||` and `!` respectively, so the following Queries are equivalent.

    where firstName == 'William' and lastName == 'Beck'
    firstName == 'William' && lastName == 'Beck'

As are these:

    where firstName == 'William' and not happy
    firstName == 'William' && !happy

#### The IN Operator
objeq supports an operator called `IN` which will return true if the left operand exists as an element of the right operand.  Presently only the searching of Arrays is supported.  The following predicate returns all Objects with a pet Property belonging to the specified set of animals.

    where pet in [ 'dog', 'cat', 'pig', 'goat', 'donkey' ]

#### Regular Expressions
objeq supports Regular Expression matching using the Ruby `=~` operator, where the left operand is a regular expression and the right operand is a string to be matched.  Unlike the Ruby operator, objeq's Regular Expression matching only returns a true or false result.  The following predicate returns all unhappy Objects that have a firstName Property beginning with the letter 'W'.

    "^W" =~ firstName && !happy

### Selector Step
After a Predicate Step is processed, the Working Set will consist of a subset of the original Source Set.  A Select Step is used to evaluate these Items and return derived content as the Result Set.

#### General Purpose Selector
General Purpose Selectors most often will be used to return Child Properties, but can also be used to generate new Objects and Arrays.  A General Purpose Selectors will evaluate *as-is*, such that there is one resulting Item for every input Item in the Working Set.  This will be the case even if the evaluation yields a `null` value.

The following Query finds all Objects with a lastName Property of 'Beck' and returns only the firstName Properties from those Objects.

    where lastName == 'Beck' select firstName

This Query is similar, but generates new Objects as its Result Set:

    lastName == 'Beck' select { fullName: firstName + ' ' + lastName }

This Query generates new Objects as its Result Set using a shorthand for directly copying fields:

    lastName == 'Beck' -> { firstName, lastName }

#### The Extend Selector
The 'Extend' Selector is similar to the General Purpose Selector except that a list of multiple Objects is specified and those Objects are merged into a single resulting Object.

    where this as %parent expand children extend this, { child_of: %parent }

You can also use the shorthand:

    this as %parent <: children |> this, { child_of: %parent }

This query will return a flattened list of all children, but with an additional property called child_of that points to their parent.  As you can produce extensions of arbitrary objects, the first item in the list must be 'this' if you want to extend the currently evaluated object.
    
#### The Expand Selector
Unlike a General Purpose Selector, an 'Expand' Selector may not yield a one-to-one mapping between the Working Set and Result Set.  The 'Expand' Selector is used to drill into an Array and return all of its elements, if there are any, contributing them individually to the final Result Set:

    lastName == 'Beck' expand addresses

You can also use the shorthand:

    lastName == 'Beck' <: addresses

In this case, each individual element of addresses will be added to the Result Set.  If addresses is not an Array, it will be returned *as-is*, but only if it's not null.  Another example:

    lastName == 'Beck' <: phoneNumber

One might think that this is semantically the same as the following:

    lastName == 'Beck' select phoneNumber

But the former query will return no Items in the Result Set if there is no associated phoneNumber.  On the other hand, the latter query will return a null in the Result Set.  If you wanted to rewrite the second query to function like the first, it would be:

    lastName == 'Beck' and phoneNumber select phoneNumber

### Grouper Step
A 'Group By' is used to group the Working Set into independent groups that will be operated upon atomically by any subsequent groupings, sorts, or aggregations. Example:

    group by lastName

Results can be grouped both by primitive values and objects (or arrays), but if a primitive value is not used, junqi will have to decorate that object or array with a grouping identifier.

Groups may be nested by separating each grouping with a comma (,):

    group by lastName, firstName aggregate count

or

    group lastName, firstName := count

This query will first group a set by lastName, and then sub-group by firstName.  The `count` aggregate will be applied to the most granular group, which in this case is firstName within lastName.  So if there are any people with exactly the same name, the result will be greater than 1.  You could simplify this query down to a single-depth group by using an expression:

    group lastName + ':' firstName := count

### Collator Step
An 'Order By' is used to sort the Working Set based on a list of provided sort criteria.  This Query sorts the results by the lastName Property in Ascending Order followed by the firstName property in Descending Order, returning a generated set of Arrays as the Result Set.

    order by lastName, firstName desc -> [ lastName + ', ' + firstName ]

### Aggregator Step
In theory, an Aggregator yields a single Item Result Set based on the Items in the Working Set.  We say 'in theory' because there is no strict requirement that the result be a single Item.  The Aggregator consists of a set of functions that are registered as junqi Library Extensions.

As an example, this will register an Extension called 'avg' for calculating average values:

    junqi.registerExtension('avg', function (ctx, value) {
      if ( Array.isArray(value) ) {
        if ( value.length === 0 ) return 0;
        for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
        return r / l;
      }
      return typeof value === 'number' ? value : NaN;
    });

This can then be use in the following way:

    age > 20 select age aggregate avg

Which filters by all Items with an age property over 20, selects the age property into the Working Set and then returns the average of all the values in the Working Set.  This could have also been written:

    age > 20 -> age := avg

What if the ages average out to a really long fractional part?  You can chain that result into a secondary function, like so:

    age > 20 -> age := avg, round

This will calculate the average and then round it.

By default, there are no Extensions registered, but you can register a set of basic functions by requiring the 'junqi/extensions' module.
