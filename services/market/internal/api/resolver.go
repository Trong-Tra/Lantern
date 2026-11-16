package api

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

// Resolver is the dependency-injection root: every query resolver reads
// through the Source (the Envio indexer's Hasura GraphQL in production,
// fakes in tests).
type Resolver struct {
	source Source
}

// NewResolver wires a data source into the resolver root.
func NewResolver(source Source) *Resolver {
	return &Resolver{source: source}
}
